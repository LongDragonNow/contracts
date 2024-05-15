// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
/* solhint-disable */
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

// Contract to create the Long Dragon token with tax and anti-snipe mechanisms and to manage the distribution of taxes among different wallets.
// The contract is based on the ERC20 standard and uses OpenZeppelin's ERC20, ERC20Burnable, ERC20Permit, and Ownable contracts.
// The contract also uses Uniswap's IUniswapV2Factory and IUniswapV2Router02 interfaces to create a pair for the token and to recognize the swap pair address.
contract LdToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    // Uniswap router and swap pair addresses
    IUniswapV2Router02 private immutable _uniswapRouter;
    address public immutable swapPair;

    // Wallet addresses for liquidity pools, reflections, and ecosystem development
    address public immutable _liquidityPoolsWallet;
    address public immutable _reflectionsWallet;
    address public immutable _ecosystemDevelopmentWallet;

    // Variables to manage taxes and limits
    uint256 public _taxPercentage = 5;
    uint256 public _liquidityTaxPercentage = 60;
    uint256 public _reflectionsTaxPercentage = 20;
    uint256 public _ecosystemTaxPercentage = 20;

    // Variables to manage max tokens per wallet and anti-snipe mechanism
    uint256 public immutable maxTokensPerWallet;
    bool public antiSnipeEnabled = true;

    // Mappings to manage exemptions from taxes and max token limits
    mapping(address => bool) public _isTaxExempt;
    mapping(address => bool) public _isExcludedFromMaxTokensPerWallet;

    // Events for logging state changes.
    event AntiSnipeEnabledUpdated(bool enabled);
    event TaxPercentageUpdated(uint256 newPercentage);
    event LiquidityTaxPercentageUpdated(uint256 newLiquidityTaxPercentage);
    event ReflectionsTaxPercentageUpdated(uint256 newReflectionsTaxPercentage);
    event EcosystemTaxPercentageUpdated(uint256 newEcosystemTaxPercentage);
    event TaxDeducted(address from, uint256 amount);
    event TaxDistributed(uint256 amountToLiquidity, uint256 amountToReflections, uint256 amountToEcosystem);
    event TaxExemptionUpdated(address account, bool exempt);
    event ExclusionFromMaxWalletTokenUpdated(address account, bool excluded);

    // Constructor to initialize the token and its parameters.
    constructor(
        address initialOwner,
        address liquidityPoolsWallet,
        address reflectionsWallet,
        address ecosystemDevelopmentWallet
    ) ERC20("Long Dragon", "LD") ERC20Permit("Long Dragon") Ownable(initialOwner) {
        require(liquidityPoolsWallet != address(0), "Liquidity pool wallet cannot be the zero address");
        require(reflectionsWallet != address(0), "Reflections wallet cannot be the zero address");
        require(ecosystemDevelopmentWallet != address(0), "Ecosystem development wallet cannot be the zero address");

        // Initializing Uniswap router
        _uniswapRouter = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

        // Creating a pair for the token
        swapPair = IUniswapV2Factory(_uniswapRouter.factory()).createPair(address(this), _uniswapRouter.WETH());

        // Assigning wallets
        _liquidityPoolsWallet = liquidityPoolsWallet;
        _reflectionsWallet = reflectionsWallet;
        _ecosystemDevelopmentWallet = ecosystemDevelopmentWallet;

        // Minting initial supply to the owner.
        _mint(msg.sender, 200_000_000 * (10 ** 18));

        // Setting max tokens per wallet to 1% of total supply.
        maxTokensPerWallet = totalSupply() / 100;

        // Setting initial tax exemptions for specific addresses.
        _isTaxExempt[msg.sender] = true;
        _isTaxExempt[_liquidityPoolsWallet] = true;
        _isTaxExempt[_reflectionsWallet] = true;
        _isTaxExempt[_ecosystemDevelopmentWallet] = true;
        _isTaxExempt[address(this)] = true;

        // Excluding specific addresses from the max tokens per wallet limit.
        _isExcludedFromMaxTokensPerWallet[msg.sender] = true;
        _isExcludedFromMaxTokensPerWallet[_liquidityPoolsWallet] = true;
        _isExcludedFromMaxTokensPerWallet[_reflectionsWallet] = true;
        _isExcludedFromMaxTokensPerWallet[_ecosystemDevelopmentWallet] = true;
        _isExcludedFromMaxTokensPerWallet[address(this)] = true;
        // Excluding the swap pair from the max tokens per wallet limit. This is to ensure the pair can always receive tokens. This can never be changed.
        _isExcludedFromMaxTokensPerWallet[swapPair] = true;
    }

    // Owner can update tax percentage ensuring it does not exceed a maximum threshold.
    function setTaxPercentage(uint256 percentage) external onlyOwner {
        require(percentage <= 25, "Percentage exceeds maximum");
        if (_taxPercentage != percentage) {
            _taxPercentage = percentage;
            emit TaxPercentageUpdated(percentage);
        }
    }

    // Owner can update how taxes are distributed among different wallets ensuring the total distribution is always 100%.
    function setTaxDistribution(
        uint256 liquidityTaxPercentage,
        uint256 reflectionsTaxPercentage,
        uint256 ecosystemTaxPercentage
    ) external onlyOwner {
        uint totalPercentage = liquidityTaxPercentage + reflectionsTaxPercentage + ecosystemTaxPercentage;
        require(totalPercentage == 100, "Total tax percentage must equal 100%");
        if (_liquidityTaxPercentage != liquidityTaxPercentage) {
            _liquidityTaxPercentage = liquidityTaxPercentage;
            emit LiquidityTaxPercentageUpdated(liquidityTaxPercentage);
        }
        if (_reflectionsTaxPercentage != reflectionsTaxPercentage) {
            _reflectionsTaxPercentage = reflectionsTaxPercentage;
            emit ReflectionsTaxPercentageUpdated(reflectionsTaxPercentage);
        }
        if (_ecosystemTaxPercentage != ecosystemTaxPercentage) {
            _ecosystemTaxPercentage = ecosystemTaxPercentage;
            emit EcosystemTaxPercentageUpdated(ecosystemTaxPercentage);
        }
    }

    // Owner can exempt addresses from paying tax
    function setTaxExemption(address account, bool exempt) external onlyOwner {
        require(account != address(0), "Account cannot be the zero address");

        if (_isTaxExempt[account] != exempt) {
            _isTaxExempt[account] = exempt;
            emit TaxExemptionUpdated(account, exempt);
        }
    }

    // Owner can enable or disable anti-snipe mechanism
    function setAntiSnipeEnabled(bool enabled) external onlyOwner {
        if (antiSnipeEnabled != enabled) {
            antiSnipeEnabled = enabled;
            emit AntiSnipeEnabledUpdated(enabled);
        }
    }

    // Owner can exclude or include addresses in the max wallet token limit and we are ensuring the swapPair address cannot be changed
    function setIsExcludedFromMaxWalletToken(address account, bool excluded) external onlyOwner {
        require(account != address(0), "Account cannot be the zero address");
        require(account != swapPair, "Cannot change state of the swapPair for max wallet token limit");

        if (_isExcludedFromMaxTokensPerWallet[account] != excluded) {
            _isExcludedFromMaxTokensPerWallet[account] = excluded;
            emit ExclusionFromMaxWalletTokenUpdated(account, excluded);
        }
    }

    // Private function to handle transfers with tax deductions
    function _transferWithTax(address sender, address recipient, uint256 amount) private {
        uint256 taxAmount = (amount * _taxPercentage) / 100;
        uint256 amountAfterTax = amount - taxAmount;

        // Deducting tax and transferring to the respective wallets if tax amount is greater than 0
        if (taxAmount > 0) {
            uint256 taxForFirst = (taxAmount * _liquidityTaxPercentage) / 100;
            uint256 taxForSecond = (taxAmount * _reflectionsTaxPercentage) / 100;
            uint256 taxForThird = taxAmount - (taxForFirst + taxForSecond);

            super._transfer(sender, _liquidityPoolsWallet, taxForFirst);
            super._transfer(sender, _reflectionsWallet, taxForSecond);
            super._transfer(sender, _ecosystemDevelopmentWallet, taxForThird);

            emit TaxDeducted(sender, taxAmount);
            emit TaxDistributed(taxForFirst, taxForSecond, taxForThird);
        }

        // Transferring the remaining amount after tax
        super._transfer(sender, recipient, amountAfterTax);
    }

    // Private function to handle pre-transfer checks including anti-snipe and tax application logic
    function _tokenTransfer(address sender, address recipient, uint256 amount) private {
        if (antiSnipeEnabled) {
            require(
                _isExcludedFromMaxTokensPerWallet[recipient] || balanceOf(recipient) + amount <= maxTokensPerWallet,
                "Recipient exceeds max wallet token amount."
            );
        }

        // Applying tax if the sender or recipient is not tax exempt and the transaction involves the swap pair
        bool applyTax = (sender == swapPair || recipient == swapPair) &&
            !_isTaxExempt[sender] &&
            !_isTaxExempt[recipient];

        // Transfer with tax if applicable, otherwise transfer without tax
        if (applyTax) {
            _transferWithTax(sender, recipient, amount);
        } else {
            super._transfer(sender, recipient, amount);
        }
    }

    // Overriding the transfer function to include tax and anti-snipe logic
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _tokenTransfer(_msgSender(), recipient, amount);
        return true;
    }

    // Overriding the transferFrom function to include tax and anti-snipe logic
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(sender, spender, amount);
        _tokenTransfer(sender, recipient, amount);
        return true;
    }
}
