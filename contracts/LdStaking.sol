// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IRewardPool } from "./Interfaces/IRewardPool.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract LdStaking is Ownable {
    error ZeroAddress(string);
    error NotsufficientStake();
    error InvalidAPR();
    error StakingNotStarted();
    error InsufficientRewardLiquidity();
    error ClaimOrUnstakeWindowNotOpen();

    using EnumerableSet for EnumerableSet.AddressSet;

    struct Stake {
        uint256 stakedLdAmount;
        uint256 lastClaimed;
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
     * @param rewardsClaimed amount of rewards claimed by the user
     */
    event RewardClaimed(address indexed userAddress, uint256 rewardsClaimed);

    /// LD token & pool interface instance
    IERC20 public _ldToken;
    IRewardPool public _rewardPool;

    /// variable to toggle state of staking and claims
    bool public lock;

    /// APR rate[annual percentage rate of rewards for staking]
    uint64 public _aprRate;

    /// total staked LD tokens by all user
    uint256 public _totalStakedLdAmount;

    /// individual staker's stake record
    mapping(address stakeHolder => Stake[] stakes) public _stakeByUser;

    /**
     * @param aprRate reward rate with extra 2 decimals eg 50% as 5000
     * @param owner owner
     * @param ldTokenAddress ld token address
     */
    constructor(uint64 aprRate, address owner, address ldTokenAddress) Ownable(owner) {
        if (ldTokenAddress == address(0)) revert ZeroAddress("LD token address can't be zero");
        if (aprRate < 100) revert InvalidAPR();
        _ldToken = IERC20(ldTokenAddress);
        _aprRate = aprRate;
        lock = true;
    }

    /**
     * @notice This function opens staking for users
     * @dev Can only be called by owner
     */
    function enableStaking() external onlyOwner {
        lock = false;
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
     * @notice This function changes the APR rate
     * @dev Can only be called by owner
     * @param newApr New APR rate
     */
    function changeApr(uint64 newApr) external onlyOwner {
        if (newApr < 100) revert InvalidAPR();
        _aprRate = newApr;
    }

    /**
     * @notice This function returns amount of LD tokens staked by user
     * @param _stakeHolder address of stake holder
     */
    function getuserStake(address _stakeHolder, uint256 stakeIndex) external view returns (Stake memory) {
        return _stakeByUser[_stakeHolder][stakeIndex];
    }

    /**
     * @notice This function handles both cases of staking LD token first time and adding to exisiting stake
     * @param amount Amount of LD tokens to be staked by user
     */
    function stakeLd(uint256 amount) external {
        if (lock) revert StakingNotStarted();
        if (amount == 0) revert("Invalid amount");

        Stake memory newStake = Stake({ stakedLdAmount: amount, lastClaimed: block.timestamp });

        _totalStakedLdAmount += amount;
        _stakeByUser[_msgSender()].push(newStake);

        _ldToken.transferFrom(_msgSender(), address(this), amount);
        emit Staked(_msgSender(), amount);
    }

    /**
     * @notice This function can be used to fully or partially unstake LD tokens
     * @param amount Amount of LD tokens to be unstaked
     */
    function unstakeLD(uint256 amount, uint256 stakeIndex) external {
        Stake memory userStake = _stakeByUser[_msgSender()][stakeIndex];
        if (!canClaimOrUnstake(userStake.lastClaimed)) revert ClaimOrUnstakeWindowNotOpen();
        if (userStake.stakedLdAmount < amount) revert NotsufficientStake();

        userStake.stakedLdAmount -= amount;
        _totalStakedLdAmount -= amount;

        if (userStake.stakedLdAmount == 0) {
            uint256 len = _stakeByUser[_msgSender()].length;
            _stakeByUser[_msgSender()][stakeIndex] = _stakeByUser[_msgSender()][len - 1];
            _stakeByUser[_msgSender()].pop();
        } else {
            _stakeByUser[_msgSender()][stakeIndex] = userStake;
        }

        _ldToken.transfer(_msgSender(), amount);
        emit Unstake(_msgSender(), amount);
    }

    function reStake(uint256 stakeIndex) external {
        Stake memory userStake = _stakeByUser[_msgSender()][stakeIndex];
        if (_stakeByUser[msg.sender][stakeIndex].stakedLdAmount <= 0) revert NotsufficientStake();
        if (!canClaimOrUnstake(userStake.lastClaimed)) revert ClaimOrUnstakeWindowNotOpen();

        uint256 weeksStaked = (block.timestamp - userStake.lastClaimed) / 7 days;
        uint256 rewardAmount = calculateRewards(weeksStaked, userStake.stakedLdAmount);
        userStake.lastClaimed = block.timestamp;
        userStake.stakedLdAmount += rewardAmount;
        _stakeByUser[_msgSender()][stakeIndex] = userStake;

        if (_rewardPool.getPooledLDAmount() < rewardAmount) revert InsufficientRewardLiquidity();
        _rewardPool.sendRewards(rewardAmount, address(this));

        emit RewardClaimed(_msgSender(), rewardAmount);
    }

    /**
     * @notice Function for claiming weekly rewards
     */
    function claimRewards(uint256 stakeIndex) external {
        Stake memory userStake = _stakeByUser[_msgSender()][stakeIndex];
        if (_stakeByUser[msg.sender][stakeIndex].stakedLdAmount <= 0) revert NotsufficientStake();
        if (!canClaimOrUnstake(userStake.lastClaimed)) revert ClaimOrUnstakeWindowNotOpen();

        uint256 weeksStaked = (block.timestamp - userStake.lastClaimed) / 7 days;
        uint256 rewardAmount = calculateRewards(weeksStaked, userStake.stakedLdAmount);
        userStake.lastClaimed = block.timestamp;
        _stakeByUser[_msgSender()][stakeIndex] = userStake;

        if (_rewardPool.getPooledLDAmount() < rewardAmount) revert InsufficientRewardLiquidity();
        _rewardPool.sendRewards(rewardAmount, _msgSender());
        emit RewardClaimed(_msgSender(), rewardAmount);
    }

    /// This function checks whether rewards are claimable or not
    /// Rewards are only claimable after 7 days
    /// Is user misses out the claiming he will need to claim at the end of next week
    /// @param lastClaimedByUser timestamp of last reward claim by user
    function canClaimOrUnstake(uint256 lastClaimedByUser) public view returns (bool) {
        uint256 daysSinceLastClaim = (block.timestamp - lastClaimedByUser) / 1 days;

        //on 8th day
        if (daysSinceLastClaim == 7) {
            return true;
        } else if (daysSinceLastClaim > 7 && daysSinceLastClaim % 7 == 0) {
            //on end of weeks
            return true;
        }

        return false;
    }

    /// @param weeksstaked number of weeks
    /// @param initPrinciple principle amount staked
    /// this function follows a linear approach to calculate rewards
    function calculateRewards(uint weeksstaked, uint initPrinciple) internal view returns (uint) {
        uint principle = initPrinciple;
        for (uint i = 0; i < weeksstaked; i++) {
            // calculating reward as per APR for one week
            uint cur = (principle * _aprRate) / 10000;
            uint reward = cur / 52;
            // adding the reward to principle amount so for next week it will be compounded
            principle += reward;
        }
        // returning rewards by subtracting principle staked initially
        return principle - initPrinciple;
    }
}
