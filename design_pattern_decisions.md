## Design Patterns

##### Default Patterns

---

The use of the following interfaces is not the result of a design choice; but radther a direct consequence of the proposed functionality. <br>
The _SlyDeFi.sol_ contract interacts with and is dependent on six different external entities:

<ul>
    <li> the user (assumed to be an EOA in implementation, yet functinally agnostic) </li>
    <li> the "ASSET" contract (in this poc iteration, DAI), which makes use of  ***IERC20.sol*** </li>
    <li> the Aave lending pool, which makes use of ***interface IAaveLendingPool*** </li>
    <li> the Aave liquidity token, which uses ***interface IaToken*** </li>
    <li> the Chainlink price oracle usese ***AggregatorV3Interface.sol*** </li>
    <li> the Chainlink keeper functionality uses ***KeeperCompatibleInterface.sol*** </li>
    <li> imports and inherits from [ERC721.sol](https://docs.openzeppelin.com/contracts/4.x/erc721) </li>
</ul>

The use of the above is a mix of: adopting a path of least resistance, functional requirements and best practice.

##### Deliberate Design Patterns

---

The SlyDeFi.sol contract makes deliberate use of the following design patterns or imported function modifiers:

<ul>
    <li>[Pull payments](https://consensys.github.io/smart-contract-best-practices/recommendations/#favor-pull-over-push-for-external-calls): user winnings are not sent, but made available. (given that the prizes are in trusted ERC20s, the merit of using a pull pattern in this specific case is debatable. It does however make sense from a capital efficiency perspective.) </li>
    <li>***onlyOwner*** modifier: perfectly adequate for POC dapps. Renders true to immutability expectations while allowing safe use of emergency functionality such as: pause() unpause() withdraw() setERC20Allowance()</li>
    <li>***nonReentrant*** modifier: critical external functions are protected against [re-entrancy](https://swcregistry.io/docs/SWC-107). The [checks-effects-interactions](https://docs.soliditylang.org/en/v0.6.11/security-considerations.html#use-the-checks-effects-interactions-pattern) pattern is, with little exception, respected. Since the contract interacts mostly with trusted patterns and does not make use of native value transfers (ETH, MATIC etc.), there is little room for such attacks. </li>
    <li>Gas Optimization: the contract makes partial use of custom error messages introduced starting with 0.8.4 over revert string error messages. State variable storage slots are intentionally ordered. Apart from this, there was no specific effort to optimize gas use. First, too many security vulnerabilities start with good gas optimization intentions. Secondly, there is no need or it does not make sense at this stage.</li>
</ul>
