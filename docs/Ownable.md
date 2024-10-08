# Ownable

_Contract module which provides a basic access control mechanism, where there is an account (an owner) that can be
granted exclusive access to specific functions. The initial owner is set to the address provided by the deployer. This
can later be changed with {transferOwnership}. This module is used through inheritance. It will make available the
modifier `onlyOwner`, which can be applied to your functions to restrict their use to the owner._

## Methods

### owner

```solidity
function owner() external view returns (address)
```

_Returns the address of the current owner._

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | address | undefined   |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```

_Leaves the contract without owner. It will not be possible to call `onlyOwner` functions. Can only be called by the
current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby disabling any functionality
that is only available to the owner._

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```

_Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner._

#### Parameters

| Name     | Type    | Description |
| -------- | ------- | ----------- |
| newOwner | address | undefined   |

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

## Errors

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
