// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IRewardPool } from "./Interfaces/IRewardPool.sol";
import { AutomationCompatibleInterface } from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract LdStaking is Ownable, AutomationCompatibleInterface {
    error ZeroAddress(string);
    error NotStaked();
    error InsufficientStake();
    error InvalidAPR();
    error StakingNotStarted();
    error StakingNotEnded();
    error InsufficientLdBalance();
    error MinimumStakeDurationNotElapsed();
    error ClaimsClosed();
    error ClaimsAlreadyOpen();
    error AlreadyClaimed();

    using EnumerableSet for EnumerableSet.AddressSet;

    struct Stake {
        uint256 stakedLdAmount;
        uint256 stakeTimestamp;
        uint256 rewards;
        bool claimed;
    }

    /**
     * @param userAddress address of interacting user
     * @param amountStaked amount staked by the user
     */
    event Staked(address indexed userAddress, uint256 amountStaked);

    /**
     * @param userAddress address of interacting user
     * @param amountUnstaked amount unstaked by the user
     */
    event Unstake(address indexed userAddress, uint256 amountUnstaked);

    /**
     * @param userAddress address of interacting user
     * @param amountWithdrawn amount withdrawn by the user
     */
    event Withdrawn(address indexed userAddress, uint256 amountWithdrawn);

    /**
     * @param userAddress address of interacting user
     * @param rewardsClaimed amount of rewards claimed by the user
     */
    event RewardClaimed(address indexed userAddress, uint256 rewardsClaimed);

    /// LD token & pool interface instance
    IERC20 public _ldToken;
    IRewardPool public _rewardPool;

    /// treasury address to collect penalties
    address public _treasuryAddress;

    /// variable to toggle state of staking and claims
    bool public lock;
    bool public claimClosed;

    /// APR rate[annual percentage rate of rewards for staking]
    uint64 public _aprRate;
    uint256 public _blocktime;

    /// timestamps for daily vesting, weekly reward and 6 month staking cycles
    uint256 public _weeklyResetTimestamp;
    uint256 public _dailyVestingTimestamp;
    uint256 public _stakingStartTimestamp;

    /// total staked LD tokens by all user
    uint256 public _totalStakedLdAmount;

    /// individual staker's stake record
    mapping(address stakeHolder => Stake stake) public _stakeByUser;

    /// addresses of all stake holders
    EnumerableSet.AddressSet private _stakeHolders;

    /**
     *
     * @param aprRate reward rate with extra 2 decimals eg 50% as 5000
     * @param blocktimeInSeconds time the target chain takes to create block eg. 2 seconds on polygon
     * @param owner owner
     * @param treasuryAddress treasury address to collect penalties
     * @param ldTokenAddress ld token address
     */
    constructor(
        uint64 aprRate,
        uint256 blocktimeInSeconds,
        address owner,
        address treasuryAddress,
        address ldTokenAddress
    ) Ownable(owner) {
        if (treasuryAddress == address(0)) revert ZeroAddress("Treasury address can't be zero");
        if (ldTokenAddress == address(0)) revert ZeroAddress("LD token address can't be zero");
        if (aprRate < 100) revert InvalidAPR();
        _ldToken = IERC20(ldTokenAddress);
        _aprRate = aprRate;
        _treasuryAddress = treasuryAddress;
        lock = true;
        claimClosed = true;
        _blocktime = blocktimeInSeconds;
        //setting cycles timestamps far ahead in time.. to avoid un-necessary invokation of automation
        //when admin enables staking.. these will reset
        _weeklyResetTimestamp = block.timestamp + 100 days;
        _dailyVestingTimestamp = block.timestamp + 100 days;
    }

    /**
     * @notice This function opens staking for users
     * @dev Can only be called by owner
     */
    function enableStaking() external onlyOwner {
        if (address(_rewardPool) == address(0)) revert ZeroAddress("Reward pool not set");
        lock = false;
        _weeklyResetTimestamp = block.timestamp + 7 days;
        _dailyVestingTimestamp = _weeklyResetTimestamp + 7 days;
        _stakingStartTimestamp = block.timestamp;
    }

    function disableStaking() external onlyOwner {
        lock = true;
    }

    /**
     * @notice This function sets the address for new pool contract
     * @dev Can only be called by owner
     * @param newPoolAddress Address of new pool contract
     */
    function setPool(address newPoolAddress) external onlyOwner {
        if (newPoolAddress == address(0)) revert ZeroAddress("Pool address can't be zero");
        _rewardPool = IRewardPool(newPoolAddress);
    }

    /**
     * @notice This function changes the treasury address
     * @dev Can only be called by owner
     * @param newTreasuryAddress new treasury address for penalty collection
     */
    function changeTreasuryAddress(address newTreasuryAddress) external onlyOwner {
        if (newTreasuryAddress == address(0)) revert ZeroAddress("Treasury address can't be zero");
        _treasuryAddress = newTreasuryAddress;
    }

    /**
     * @notice This function changes the APR rate
     * @dev Can only be called by owner
     * @param newApr New APR rate
     */
    function changeApr(uint8 newApr) external onlyOwner {
        if (newApr < 100) revert InvalidAPR();
        _aprRate = newApr;
    }

    /**
     * @notice This function returns amount of LD tokens staked by user
     * @param _stakeHolder address of stake holder
     */
    function getStakedBy(address _stakeHolder) external view returns (uint256) {
        return _stakeByUser[_stakeHolder].stakedLdAmount;
    }

    /**
     * @notice This function handles both cases of staking LD token first time and adding to exisiting stake
     * @param amount Amount of LD tokens to be staked by user
     */
    function stakeLd(uint256 amount) external {
        if (lock) revert StakingNotStarted();
        if (_ldToken.balanceOf(_msgSender()) < amount) revert InsufficientLdBalance();

        Stake memory newStake;
        if (_stakeHolders.contains(_msgSender())) {
            newStake = _stakeByUser[_msgSender()];
        } else {
            newStake = Stake({ stakedLdAmount: 0, stakeTimestamp: block.timestamp, rewards: 0, claimed: false });
            _stakeHolders.add(_msgSender());
        }
        newStake.stakedLdAmount += amount;
        _totalStakedLdAmount += amount;
        _stakeByUser[_msgSender()] = newStake;

        _ldToken.transferFrom(_msgSender(), address(_rewardPool), amount);
        emit Staked(_msgSender(), amount);
    }

    /**
     * @notice This function can be used to fully or partially unstake LD tokens
     * @param amount Amount of LD tokens to be unstaked
     */
    function unstakeLD(uint256 amount) external {
        Stake memory userStake = _stakeByUser[_msgSender()];
        if (!_stakeHolders.contains(_msgSender())) revert NotStaked();
        if (userStake.stakedLdAmount < amount) revert InsufficientStake();
        if (!lock) revert StakingNotEnded();

        userStake.stakedLdAmount -= amount;
        _totalStakedLdAmount -= amount;
        if (userStake.stakedLdAmount == 0) {
            delete _stakeByUser[_msgSender()];
            _stakeHolders.remove(_msgSender());
        }

        _rewardPool.sendTokens(amount, _msgSender());
        emit Unstake(_msgSender(), amount);
    }

    /**
     * @notice This function is similar to unstake but enables user to
     * take out the funds in emergency. It also cuts the 30% of amount as penalty and sends it to
     * treasury address.
     * @param amount Amount of LD tokens to be withdtrawn
     */
    function emerygencyWithdraw(uint256 amount) external {
        Stake memory userStake = _stakeByUser[_msgSender()];
        if (!_stakeHolders.contains(_msgSender())) revert NotStaked();
        if (userStake.stakedLdAmount < amount) revert InsufficientStake();
        if (block.timestamp - userStake.stakeTimestamp < 30 days) revert MinimumStakeDurationNotElapsed();

        uint256 payout = (amount * 70) / 100;
        userStake.stakedLdAmount -= amount;
        _totalStakedLdAmount -= amount;
        if (userStake.stakedLdAmount == 0) {
            delete _stakeByUser[_msgSender()];
            _stakeHolders.remove(_msgSender());
        }

        _rewardPool.sendTokens(amount - payout, _treasuryAddress);
        _rewardPool.sendTokens(payout, _msgSender());
        emit Withdrawn(_msgSender(), amount);
    }

    /**
     * @notice Function for claiming weekly rewards
     * @dev Can only be called when claims are open
     */
    function claimRewards() external {
        if (claimClosed) revert ClaimsClosed();
        Stake memory userStake = _stakeByUser[_msgSender()];
        if (!_stakeHolders.contains(_msgSender())) revert NotStaked();
        if (userStake.claimed) revert AlreadyClaimed();

        uint256 rewardAmount = calculateRewards(userStake);
        userStake.claimed = true;
        userStake.rewards = (userStake.rewards + rewardAmount) / 7;

        delete _stakeByUser[_msgSender()];
        _stakeByUser[_msgSender()] = userStake;

        emit RewardClaimed(_msgSender(), rewardAmount);
    }

    /**
     * @notice Function responsible for restaking the rewards
     * @dev Can only be called when claimes are open
     */
    function restakeReward() external {
        if (claimClosed) revert ClaimsClosed();
        Stake memory userStake = _stakeByUser[_msgSender()];
        if (userStake.stakedLdAmount <= 0) revert NotStaked();
        if (userStake.claimed) revert AlreadyClaimed();

        uint256 rewardAmount = calculateRewards(userStake);

        userStake.stakedLdAmount += rewardAmount;
        _totalStakedLdAmount += _totalStakedLdAmount;
        userStake.claimed = true;
        delete _stakeByUser[_msgSender()];
        _stakeByUser[_msgSender()] = userStake;

        emit RewardClaimed(_msgSender(), rewardAmount);
    }

    /// @dev only owner can call this function
    /// @notice function responsible for manuelly closing rewardsclaims
    function disableRewardClaims() external onlyOwner {
        if (claimClosed) revert ClaimsClosed();
        claimClosed = true;
    }

    /**
     * @dev This function is invoked by chainlink automation
     * @notice This function is responsible for checking if any of the cycles are complete
     * @return upkeepNeeded - if upkeep needs to be performed or not
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory /*performData*/) {
        if (
            _weeklyResetTimestamp <= block.timestamp ||
            _dailyVestingTimestamp <= block.timestamp ||
            block.timestamp - _stakingStartTimestamp >= 26 weeks
        ) {
            upkeepNeeded = true;
        }
        // Explicitly return the upkeepNeeded variable.
        return (upkeepNeeded, "");
    }

    /**
     * @dev This function is called by chainlink automation to execute functions, when certain cycle is completed.
     * @notice This function is responsible for distributing vested daily rewards,
     * resetting rewards after weekly cycle and opening, and closing reward claims at begining of new weekly cycle.
     */
    function performUpkeep(bytes calldata /*performData*/) external override {
        if (_dailyVestingTimestamp <= block.timestamp) {
            /// close claims at begining of first daily reward distribution at begining of current weekly cycle
            if (_weeklyResetTimestamp - _dailyVestingTimestamp >= 6 days && claimClosed == false) claimClosed = true;
            _distributeReward();
            /// set time for next daily cycle end
            _dailyVestingTimestamp += 1 days;
        }

        if (_weeklyResetTimestamp <= block.timestamp) {
            resetRewards();
            claimClosed = false;
            _weeklyResetTimestamp += 7 days;
        }

        if (block.timestamp - _stakingStartTimestamp >= 26 weeks) {
            lock = true;
        }
    }

    /**
     * @notice function responsible for calculating rewards for current reward cycle
     * @param userStake Stake record of user
     */
    function calculateRewards(Stake memory userStake) internal view returns (uint256 rewards) {
        //If staketimestamp is older than specified timeframes apply boosts on reward amount
        uint8 boost;
        if (block.timestamp - userStake.stakeTimestamp > 90 days) {
            boost = 25;
        } else if (block.timestamp - userStake.stakeTimestamp > 60 days) {
            boost = 15;
        }

        //User's contribution to staking pool.. decimals to be adjusted in later calculation
        uint256 userContribution = (userStake.stakedLdAmount * 1 ether * 100) / _totalStakedLdAmount;

        //time remaining for staking
        uint256 blocksRem = ((_stakingStartTimestamp + 26 weeks) - block.timestamp) / _blocktime;

        // required factors are present, need to formulate the calculation
        uint256 poolSize = _ldToken.balanceOf(address(_rewardPool));

        // total rewards as per pool size for whole period
        rewards = (poolSize * _aprRate) / 100;

        // rewards for time remaining
        rewards = rewards / (blocksRem / 1 weeks);

        // rewards for user based on user contribution
        // and dividing by 100 * 1 ether [100 ether] to remove earlier added padding
        rewards = (rewards * userContribution) / 100 ether;

        // boost in reward as per time user has staked
        rewards += (rewards * boost) / 100;
    }

    /**
     * @dev This function is invoked once every week to reset rewards and claim status
     */
    function resetRewards() internal {
        uint256 len = _stakeHolders.length();
        for (uint256 i = 0; i < len; i++) {
            Stake memory curStake = _stakeByUser[_stakeHolders.at(i)];
            if (curStake.claimed) {
                curStake.rewards = 0;
                curStake.claimed = false;
            } else if (curStake.stakeTimestamp < _weeklyResetTimestamp) {
                // have staked before start of weekly cycle but did not claimed
                curStake.rewards += calculateRewards(curStake);
            }
            //re-write updated record
            delete _stakeByUser[_stakeHolders.at(i)];
            _stakeByUser[_stakeHolders.at(i)] = curStake;
        }
    }

    /**
     * @dev This function is invoked once every day to distribute rewards to users
     *  who choosed to claimed rewards
     */
    function _distributeReward() internal {
        uint256 len = _stakeHolders.length();
        for (uint256 i = 0; i < len; i++) {
            address curStakeHolder = _stakeHolders.at(i);
            if (_stakeByUser[curStakeHolder].claimed && _stakeByUser[curStakeHolder].rewards > 0) {
                //amount
                uint256 amount = _stakeByUser[curStakeHolder].rewards;
                //transfer
                _rewardPool.sendTokens(amount, curStakeHolder);
            }
        }
    }
}
