// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IRewardPool } from "./Interfaces/IRewardPool.sol";

contract RewardPool is Ownable, IRewardPool {
    error UnAuthorized();

    IERC20 public _ldToken;

    address public _ldStakingContract;

    constructor(address owner, address ldStakingContract, address ldTokenAddress) Ownable(owner) {
        _ldStakingContract = ldStakingContract;
        _ldToken = IERC20(ldTokenAddress);
    }

    function sendTokens(uint256 amount, address to) external {
        if (_msgSender() != _ldStakingContract) revert UnAuthorized();
        _ldToken.transfer(to, amount);
    }

    function fundPool(uint256 amount) external onlyOwner {
        _ldToken.transferFrom(_msgSender(), address(this), amount);
    }

    function withdrawRemainingTokens() external onlyOwner {
        _ldToken.transfer(_msgSender(), _ldToken.balanceOf(_msgSender()));
    }
}
