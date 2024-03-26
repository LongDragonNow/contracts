# LdStaking

## Methods

### \_aprRate

```solidity
function _aprRate() external view returns (uint64)
```

APR rate[annual percentage rate of rewards for staking]

#### Returns

| Name | Type   | Description |
| ---- | ------ | ----------- |
| \_0  | uint64 | undefined   |

### \_blocktime

```solidity
function _blocktime() external view returns (uint256)
```

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### \_dailyVestingTimestamp

```solidity
function _dailyVestingTimestamp() external view returns (uint256)
```

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### \_ldToken

```solidity
function _ldToken() external view returns (contract IERC20)
```

LD token &amp; pool interface instance

#### Returns

| Name | Type            | Description |
| ---- | --------------- | ----------- |
| \_0  | contract IERC20 | undefined   |

### \_rewardPool

```solidity
function _rewardPool() external view returns (contract IRewardPool)
```

#### Returns

| Name | Type                 | Description |
| ---- | -------------------- | ----------- |
| \_0  | contract IRewardPool | undefined   |

### \_stakeByUser

```solidity
function _stakeByUser(address stakeHolder) external view returns (uint256 stakedLdAmount, uint256 stakeTimestamp, uint256 rewards, bool claimed)
```

individual staker&#39;s stake record

#### Parameters

| Name        | Type    | Description |
| ----------- | ------- | ----------- |
| stakeHolder | address | undefined   |

#### Returns

| Name           | Type    | Description |
| -------------- | ------- | ----------- |
| stakedLdAmount | uint256 | undefined   |
| stakeTimestamp | uint256 | undefined   |
| rewards        | uint256 | undefined   |
| claimed        | bool    | undefined   |

### \_stakingStartTimestamp

```solidity
function _stakingStartTimestamp() external view returns (uint256)
```

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### \_totalStakedLdAmount

```solidity
function _totalStakedLdAmount() external view returns (uint256)
```

total staked LD tokens by all user

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### \_treasuryAddress

```solidity
function _treasuryAddress() external view returns (address)
```

treasury address to collect penalties

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | address | undefined   |

### \_weeklyResetTimestamp

```solidity
function _weeklyResetTimestamp() external view returns (uint256)
```

timestamps for daily vesting, weekly reward and 6 month staking cycles

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### changeApr

```solidity
function changeApr(uint8 newApr) external nonpayable
```

This function changes the APR rate

_Can only be called by owner_

#### Parameters

| Name   | Type  | Description  |
| ------ | ----- | ------------ |
| newApr | uint8 | New APR rate |

### changeTreasuryAddress

```solidity
function changeTreasuryAddress(address newTreasuryAddress) external nonpayable
```

This function changes the treasury address

_Can only be called by owner_

#### Parameters

| Name               | Type    | Description                                 |
| ------------------ | ------- | ------------------------------------------- |
| newTreasuryAddress | address | new treasury address for penalty collection |

### checkUpkeep

```solidity
function checkUpkeep(bytes) external view returns (bool upkeepNeeded, bytes)
```

This function is responsible for checking if any of the cycles are complete

_This function is invoked by chainlink automation_

#### Parameters

| Name | Type  | Description |
| ---- | ----- | ----------- |
| \_0  | bytes | undefined   |

#### Returns

| Name         | Type  | Description                              |
| ------------ | ----- | ---------------------------------------- |
| upkeepNeeded | bool  | - if upkeep needs to be performed or not |
| \_1          | bytes | undefined                                |

### claimClosed

```solidity
function claimClosed() external view returns (bool)
```

#### Returns

| Name | Type | Description |
| ---- | ---- | ----------- |
| \_0  | bool | undefined   |

### claimRewards

```solidity
function claimRewards() external nonpayable
```

Function for claiming weekly rewards

_Can only be called when claims are open_

### disableRewardClaims

```solidity
function disableRewardClaims() external nonpayable
```

function responsible for manuelly closing rewardsclaims

_only owner can call this function_

### disableStaking

```solidity
function disableStaking() external nonpayable
```

### emerygencyWithdraw

```solidity
function emerygencyWithdraw(uint256 amount) external nonpayable
```

This function is similar to unstake but enables user to take out the funds in emergency. It also cuts the 30% of amount
as penalty and sends it to treasury address.

#### Parameters

| Name   | Type    | Description                          |
| ------ | ------- | ------------------------------------ |
| amount | uint256 | Amount of LD tokens to be withdtrawn |

### enableStaking

```solidity
function enableStaking() external nonpayable
```

This function opens staking for users

_Can only be called by owner_

### getStakedBy

```solidity
function getStakedBy(address _stakeHolder) external view returns (uint256)
```

This function returns amount of LD tokens staked by user

#### Parameters

| Name          | Type    | Description             |
| ------------- | ------- | ----------------------- |
| \_stakeHolder | address | address of stake holder |

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### lock

```solidity
function lock() external view returns (bool)
```

variable to toggle state of staking and claims

#### Returns

| Name | Type | Description |
| ---- | ---- | ----------- |
| \_0  | bool | undefined   |

### owner

```solidity
function owner() external view returns (address)
```

_Returns the address of the current owner._

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | address | undefined   |

### performUpkeep

```solidity
function performUpkeep(bytes) external nonpayable
```

This function is responsible for distributing vested daily rewards, resetting rewards after weekly cycle and opening,
and closing reward claims at begining of new weekly cycle.

_This function is called by chainlink automation to execute functions, when certain cycle is completed._

#### Parameters

| Name | Type  | Description |
| ---- | ----- | ----------- |
| \_0  | bytes | undefined   |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```

_Leaves the contract without owner. It will not be possible to call `onlyOwner` functions. Can only be called by the
current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby disabling any functionality
that is only available to the owner._

### restakeReward

```solidity
function restakeReward() external nonpayable
```

Function responsible for restaking the rewards

_Can only be called when claimes are open_

### setPool

```solidity
function setPool(address newPoolAddress) external nonpayable
```

This function sets the address for new pool contract

_Can only be called by owner_

#### Parameters

| Name           | Type    | Description                  |
| -------------- | ------- | ---------------------------- |
| newPoolAddress | address | Address of new pool contract |

### stakeLd

```solidity
function stakeLd(uint256 amount) external nonpayable
```

This function handles both cases of staking LD token first time and adding to exisiting stake

#### Parameters

| Name   | Type    | Description                              |
| ------ | ------- | ---------------------------------------- |
| amount | uint256 | Amount of LD tokens to be staked by user |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```

_Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner._

#### Parameters

| Name     | Type    | Description |
| -------- | ------- | ----------- |
| newOwner | address | undefined   |

### unstakeLD

```solidity
function unstakeLD(uint256 amount) external nonpayable
```

This function can be used to fully or partially unstake LD tokens

#### Parameters

| Name   | Type    | Description                        |
| ------ | ------- | ---------------------------------- |
| amount | uint256 | Amount of LD tokens to be unstaked |

## Events

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```

#### Parameters

| Name                    | Type    | Description |
| ----------------------- | ------- | ----------- |
| previousOwner `indexed` | address | undefined   |
| newOwner `indexed`      | address | undefined   |

### RewardClaimed

```solidity
event RewardClaimed(address indexed userAddress, uint256 rewardsClaimed)
```

#### Parameters

| Name                  | Type    | Description                           |
| --------------------- | ------- | ------------------------------------- |
| userAddress `indexed` | address | address of interacting user           |
| rewardsClaimed        | uint256 | amount of rewards claimed by the user |

### Staked

```solidity
event Staked(address indexed userAddress, uint256 amountStaked)
```

#### Parameters

| Name                  | Type    | Description                 |
| --------------------- | ------- | --------------------------- |
| userAddress `indexed` | address | address of interacting user |
| amountStaked          | uint256 | amount staked by the user   |

### Unstake

```solidity
event Unstake(address indexed userAddress, uint256 amountUnstaked)
```

#### Parameters

| Name                  | Type    | Description                 |
| --------------------- | ------- | --------------------------- |
| userAddress `indexed` | address | address of interacting user |
| amountUnstaked        | uint256 | amount unstaked by the user |

### Withdrawn

```solidity
event Withdrawn(address indexed userAddress, uint256 amountWithdrawn)
```

#### Parameters

| Name                  | Type    | Description                  |
| --------------------- | ------- | ---------------------------- |
| userAddress `indexed` | address | address of interacting user  |
| amountWithdrawn       | uint256 | amount withdrawn by the user |

## Errors

### AlreadyClaimed

```solidity
error AlreadyClaimed()
```

### ClaimsAlreadyOpen

```solidity
error ClaimsAlreadyOpen()
```

### ClaimsClosed

```solidity
error ClaimsClosed()
```

### InsufficientLdBalance

```solidity
error InsufficientLdBalance()
```

### InsufficientStake

```solidity
error InsufficientStake()
```

### InvalidAPR

```solidity
error InvalidAPR()
```

### MinimumStakeDurationNotElapsed

```solidity
error MinimumStakeDurationNotElapsed()
```

### NotStaked

```solidity
error NotStaked()
```

### OwnableInvalidOwner

```solidity
error OwnableInvalidOwner(address owner)
```

_The owner is not a valid owner account. (eg. `address(0)`)_

#### Parameters

| Name  | Type    | Description |
| ----- | ------- | ----------- |
| owner | address | undefined   |

### OwnableUnauthorizedAccount

```solidity
error OwnableUnauthorizedAccount(address account)
```

_The caller account is not authorized to perform an operation._

#### Parameters

| Name    | Type    | Description |
| ------- | ------- | ----------- |
| account | address | undefined   |

### StakingNotEnded

```solidity
error StakingNotEnded()
```

### StakingNotStarted

```solidity
error StakingNotStarted()
```

### ZeroAddress

```solidity
error ZeroAddress(string)
```

#### Parameters

| Name | Type   | Description |
| ---- | ------ | ----------- |
| \_0  | string | undefined   |
