// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IRewardPool {
    function sendRewards(uint256 amount, address to) external;
    function fundPool(uint256 amount) external;
    function withdrawRemainingTokens() external;
    function getPooledLDAmount() external returns (uint256);
}
