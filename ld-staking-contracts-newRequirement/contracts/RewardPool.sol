// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IRewardPool } from "./Interfaces/IRewardPool.sol";

/// Issue - Fund Lock Due to Incorrect Balance Reference in withdrawRemainingTokens
/// Solution - fixed typo in withdraw function from balanceOf(msg.sender) to _pooledLdAmount)
contract RewardPool is Ownable, IRewardPool {
    error UnAuthorized();
    error InsufficientFunds();
    error ZeroAddress(string);

    IERC20 public _ldToken;

    address public _ldStakingContract;

    uint256 public _pooledLdAmount;

    constructor(address owner, address ldStakingContract, address ldTokenAddress) Ownable(owner) {
        if (ldStakingContract == address(0)) revert ZeroAddress("Staking contract address can't be zero");
        if (ldTokenAddress == address(0)) revert ZeroAddress("LDToken contract address can't be zero");
        _ldStakingContract = ldStakingContract;
        _ldToken = IERC20(ldTokenAddress);
    }

    modifier onlyStakingContract() {
        if (_msgSender() != _ldStakingContract) revert UnAuthorized();
        _;
    }

    function sendRewards(uint256 amount, address to) external onlyStakingContract {
        if (amount > _pooledLdAmount) revert InsufficientFunds();
        _pooledLdAmount -= amount;
        _ldToken.transfer(to, amount);
    }

    function fundPool(uint256 amount) external onlyOwner {
        _pooledLdAmount += amount;
        _ldToken.transferFrom(_msgSender(), address(this), amount);
    }

    function withdrawRemainingTokens() external onlyOwner {
        _ldToken.transfer(_msgSender(), _ldToken.balanceOf(address(this)));
    }
}
