// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
//import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

//import { IConstantFlowAgreementV1 } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";
//import { ISuperTokenFactory } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperTokenFactory.sol";
//import { ISuperfluidToken } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluidToken.sol";
//import { SuperTokenFactory } from "@superfluid-finance/ethereum-contracts/contracts/superfluid/SuperTokenFactory.sol";
//import { SuperfluidToken } from "@superfluid-finance/ethereum-contracts/contracts/superfluid/SuperfluidToken.sol";

//@author:parseb
//@title SlyDe.Fi - a preditction game on pooled yeld farming
//@custom: security-contact @parseb

/* =========== Interfaces ============= */

interface IaToken {
    function balanceOf(address _user) external view returns (uint256);

    function redeem(uint256 _amount) external;
}

interface IAaveLendingPool {
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external;

    function getReservesList() external view returns (address[] memory);
}

/* =========== SlyDeFi Contract Start ============= */

contract SlyDeFi is
    Ownable,
    ReentrancyGuard,
    ERC721,
    Pausable,
    ERC721Burnable,
    ERC721URIStorage,
    KeeperCompatibleInterface /// @dev: check just added. needed?
{
    //@notice day: incremented daily by keeper, number of days since start
    ///@dev day: used as position selector range narrower
    uint16 public day;
    //@notice posId: position ID incremented on position creation
    uint32 public posId;
    //@notice isActive: used for fast checking return scope for dApp render
    mapping(address => bool) public isActive;
    //@notice dayPricePositions: used to add and retrieve position ID in price-day matrix
    mapping(uint16 => mapping(uint32 => uint32[])) public dayPriceGetPositions;
    //@notice endDateWinners: used to collect possitions that will get rewarded at the end of cycle
    ///@dev refactoring will be lots of 'fun'
    //mapping(uint16 => uint32[]) public endDateWinners;
    //@notice isPositionInWinArray: to avoid duplicate entry of PositionID in endDateWinners[enddate] uint32[]
    mapping(uint32 => bool) public isPositionInWinArray;
    //@notice getPositionById
    mapping(uint32 => Position) public getPositionById;
    //@notice check if user has position for submitted timeframe: userHasTimeEndPosition[msg.sender][_enddate]
    ///@dev temporary limitation, re-asses
    mapping(address => mapping(uint16 => bool)) public userHasTimeEndPosition;

    //@notice userPositions: get all positions of msg.sender
    mapping(address => uint32[]) public userPositions;

    //@notice tvl of day-price matrix cell, used to determine share of winnings. @security: review
    mapping(uint16 => mapping(uint64 => uint128)) public dayPriceTVL;

    //mapping(uint16 => uint32) public endDayBudget;

    mapping(address => uint256) public userWinnings;

    uint64 public lastETHPrice;
    uint64 lastUpkeep;
    uint256 immutable MINVALUE;
    uint256 immutable UPKEEPBLOCKDISTANCE;

    uint80 lastRoundId;

    //@notice Accurate reflaction of user base value(s) sum
    mapping(address => uint256) public userDepositedDai;
    ///@notice totalDepositedDai: lifetime metric. No decrement.
    uint128 public totalDepositedDai;

    AggregatorV3Interface internal priceFeed;
    ///@dev: @TODO position owner change on NFT transfer (maybe)
    struct Position {
        uint32 id;
        address owner;
        uint32[30] graph;
        uint16 start;
        uint16 end;
        uint16 shares;
        uint128 baseValue;
        string imghash;
    }

    /* =========== AaveSly State ============= */

    ///@dev replace hardcoded with contract address provider interface
    IERC20 public dai = IERC20(0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F);
    IaToken public aToken = IaToken(0x639cB7b21ee2161DF9c882483C9D55c90c20Ca3e);
    IAaveLendingPool public aaveLendingPool =
        IAaveLendingPool(0x9198F13B08E299d85E096929fA9781A1E3d5d827);

    // supertokenfactory mumbai 0x200657E2f123761662567A1744f9ACAe50dF47E6
    // aave pool mumbai -  0x9198F13B08E299d85E096929fA9781A1E3d5d827
    // aave stable interest: 0x10dec6dF64d0ebD271c8AdD492Af4F5594358919
    // aave variable interest: 0x6D29322ba6549B95e98E9B08033F5ffb857f19c5
    // polygon contracts: https://docs.aave.com/developers/deployed-contracts/matic-polygon-market

    //@notice owner set to msg.sender on create
    constructor() ERC721("SlyDe.Fi", "SLYDE") {
        day = 1;
        posId = 1;

        ///@dev the oracle price uses 8 decimals
        ///@dev MINVALUE should be constant or in
        MINVALUE = 1000 * 10**18;
        UPKEEPBLOCKDISTANCE = 5757;
        lastUpkeep = 1;

        //@notice EXTERNAL CALLS
        // dai.approve(address(aaveLendingPool), type(uint256).max);
        priceFeed = AggregatorV3Interface(
            0x0715A7794a1dc8e42615F059dD6e406A6594651A
        );
    }

    //* --- Initialize **//

    ///@dev this should be in constructor. maybe?
    ///@notice sets transfer approval for ERC20s
    function setERCAllowance(address _erc) public onlyOwner returns (bool) {
        if (_erc == address(0)) {
            _erc = address(dai);
        }

        IERC20(_erc).approve(address(aaveLendingPool), type(uint256).max);

        return true;
    }

    //*--- Fallback ---*//
    receive() external payable {}

    fallback() external {}

    //*--- Errors ---*//

    ///@notice used for when user input value smaller than constant MINVALUE
    error SmallerThanMin(uint256 requested, uint256 required);
    //@TO DO: ensure custom timeframe compatibility
    ///@notice error if user has already submitted a position for the same timeframe or, same enddate
    error UserAlreadyHasPositionEndingOnThisDay(uint16 endDay, address user);
    ///@notice error only if performUpkeep in progress or perfomed without check
    error DoingUpkeepOrNoCheck(uint256 thisblock, uint256 lastblock);
    ///@notice error if caller has no winnings to withdraw
    error NoWinningsToWithdraw(address user);

    //*--- Modifiers ---*//
    modifier ensureUniqueForEnd(uint16 _endsOn) {
        bool timeRangeNotEmpty = userHasTimeEndPosition[msg.sender][_endsOn];
        if (timeRangeNotEmpty)
            revert UserAlreadyHasPositionEndingOnThisDay({
                endDay: _endsOn,
                user: msg.sender
            });
        _;
    }

    ///@param _statedValue: provided in submitPosition() call by user as value of position
    modifier ercMinVal(uint256 _statedValue) {
        if (_statedValue < MINVALUE)
            revert SmallerThanMin({
                requested: _statedValue,
                required: MINVALUE
            });
        _;
    }

    //*--- External ---*//
    ///@notice submitPosition(): creates position, transfers dai, mints nft, changes state
    ///@param _graph: array of uint32, length 30, represents points in day-price matrix
    ///@param _value: base value of position
    ///@param _end: end date of position
    ///@param _imghash: image hash or IPFS metadata link for NFT
    function submitPosition(
        uint32[30] memory _graph,
        uint128 _value,
        uint16 _end,
        string calldata _imghash
    )
        external
        payable
        nonReentrant
        ensureUniqueForEnd(_end)
        ercMinVal(_value)
        returns (bool)
    {
        Position memory currentPosition;
        uint16 _start = day + 1;

        currentPosition = Position({
            id: posId,
            owner: msg.sender,
            graph: _graph,
            start: _start,
            end: _start + _end,
            shares: 0,
            baseValue: _value,
            imghash: _imghash
        });

        uint256 beforeDai = dai.balanceOf(address(this));
        require(beforeDai >= currentPosition.baseValue);

        userPositions[msg.sender].push(currentPosition.id);
        getPositionById[currentPosition.id] = currentPosition;
        //dayPresentCapital[end] += currentPosition.baseValue;
        userHasTimeEndPosition[msg.sender][currentPosition.end] = true;
        if (!isActive[msg.sender]) isActive[msg.sender] = true;

        ///@dev is this safe? memory>struct>array
        ///@dev SWC-110. Out of bounds array access? check. I say false positive.
        for (uint16 i = 0; i < currentPosition.graph.length; i++) {
            dayPriceGetPositions[currentPosition.start + i][
                currentPosition.graph[i]
            ].push(posId);
            dayPriceTVL[currentPosition.start + i][
                currentPosition.graph[i]
            ] += currentPosition.baseValue;
        }

        totalDepositedDai += currentPosition.baseValue;
        userDepositedDai[msg.sender] += currentPosition.baseValue;

        aaveLendingPool.deposit(
            address(dai),
            currentPosition.baseValue,
            address(this),
            0
        );
        safeMint(msg.sender, posId);

        _setTokenURI(posId, currentPosition.imghash);

        require(ownerOf(posId) == msg.sender, "Mint Unnsuccessful");

        posId += 1;

        return true;
    }

    ///@dev should revert on receive() ?
    ///@param _beneficiary: address to send entire contract native balance to
    function withdraw(address _beneficiary) public onlyOwner {
        (bool success, ) = payable(_beneficiary).call{
            value: address(this).balance
        }("");
        require(success, "transfer failed");
    }

    ///@dev calldata not used. remove? @security public function, needs to be external
    ///@dev if function should prevent re-entrancy
    ///@notice chainlink keeper docking function, executes when checkUpkeep() returns true
    function performUpkeep(
        bytes calldata /* performData */
    ) public {
        ///@dev external chainlink call
        (uint80 roundID, int256 price, , , ) = priceFeed.latestRoundData();

        uint256 price2 = uint256(price);
        if (
            lastRoundId == roundID ||
            (block.number - lastUpkeep) < UPKEEPBLOCKDISTANCE
        )
            revert DoingUpkeepOrNoCheck({
                thisblock: block.number,
                lastblock: lastUpkeep
            });

        lastUpkeep = uint64(block.number);

        lastETHPrice = uint64(price2) / 100000000;
        uint32[] memory winners = dayPriceGetPositions[day][
            uint32(lastETHPrice)
        ];

        //@notice asignes shares per winning day position if any
        ///@dev @security: potentianl attack vector: pump dayPriceTVL by create + burn loop -> disproportionate share distribution?? what incentive?
        for (uint256 i = 0; i < winners.length; i++) {
            Position storage winner = getPositionById[winners[i]];
            if (winner.id == 0) continue;
            winner.shares = uint16(
                (winner.baseValue * 100) / dayPriceTVL[day][lastETHPrice] + 1
            );

            isPositionInWinArray[winner.id] = true;

            //redeamableEndShares[winner.end] += winner.shares;

            uint256 budget = (aToken.balanceOf(address(this)) -
                totalDepositedDai) / 31;
            userWinnings[winner.owner] += (budget / 100) * winner.shares;
            //@notice skimming or financing a treasury or for vc:
            //@notice charging a money walking service fee
            ///@dev streaming onWin. pro/cons to enday pull payout.
        }
        lastRoundId = roundID;
        day += 1;
    }

    //*--- Public ---*//
    ///@notice burns ERC721, credits base value of underlying position. Returns true if successful.
    ///@param _tokenIdtoBurn: The token ID of the requested token to burn.;
    function burnToken(uint256 _tokenIdtoBurn)
        public
        nonReentrant
        returns (bool)
    {
        //@dev uint32 implicit conversion might be @security risk
        Position memory burnablePosition = getPositionById[
            uint32(_tokenIdtoBurn)
        ];

        require(
            burnablePosition.owner == msg.sender,
            "Burning a token you do not own"
        );

        burn(_tokenIdtoBurn);

        aaveLendingPool.withdraw(
            address(dai),
            burnablePosition.baseValue,
            msg.sender
        );

        for (uint32 i = 0; i < userPositions[msg.sender].length; i++) {
            if (userPositions[msg.sender][i] == _tokenIdtoBurn) {
                ///@dev inplace storage gap
                delete userPositions[msg.sender][i];
                break;
            }
        }

        if (userPositions[msg.sender].length == 0) isActive[msg.sender] = false;

        userDepositedDai[msg.sender] -= burnablePosition.baseValue;
        ///@dev @security: potential fix for day_tvl loop. implies aditional check.
        getPositionById[burnablePosition.id].id = 0;

        return true;
    }

    ///@dev @TODO: this should be a stream conditional on continuation of underlying position principal.
    ///@dev @TODO: this should take in as argument the type of asset liquidated. (e.g. ETH, DAI, DOG, CAT etc.)
    ///@dev @TODO: even if nonReeentrant, should follow c-e-i.
    ///@notice lets User to pull DAI winnings. Returns true on success.
    function withdrawWinnings() public nonReentrant returns (bool) {
        require(userWinnings[msg.sender] > 0);

        if (userWinnings[msg.sender] == 0)
            revert NoWinningsToWithdraw({user: msg.sender});

        uint256 prevUserDai = dai.balanceOf(msg.sender);

        aaveLendingPool.withdraw(
            address(dai),
            userWinnings[msg.sender],
            msg.sender
        );

        require(prevUserDai < dai.balanceOf(msg.sender), "Withdrawal failed");

        userWinnings[msg.sender] = 0;

        return true;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function safeMint(address to, uint256 tokenId) internal {
        _safeMint(to, tokenId);
    }

    ///@notice ERC721 hook
    ///@dev @security: private maybe?
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    ///@notice burns an ERC721 given its id
    ///@param tokenId: The token ID of the token to burn
    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    /* ===========   ============= */

    //*--- Private ---*//

    //*--- View ---*//

    ///@notice view function called repetedly by Chainlink keepers service.
    ///@notice determines if upkeep is needed. returns true if upkeep is needed.
    ///@dev the UPKEEPBLOCKDISTANCE might have been set for mainent. oups.
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        public
        view
        override(KeeperCompatibleInterface)
        returns (bool upkeepNeeded, bytes memory upkeepData)
    {
        if ((block.number - lastUpkeep) > UPKEEPBLOCKDISTANCE) {
            upkeepNeeded = true;
            upkeepData;
        } else {
            upkeepNeeded = false;
            upkeepData;
        }
    }

    ///@notice checks if the provided address is registered as active protocol participant.
    ///@param _who: address passed to isActive mapping to return a boolean conclusion for.
    function isUserActive(address _who) public view returns (bool) {
        return isActive[_who];
    }

    ///@notice returns the URI of a token given its ID.
    ///@param tokenId: for what token ID to return the URI.
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    ///@notice returns an array of position IDs owned by a given address.
    ///@param _who: The address to check for owned positions.
    function getUserPositions(address _who)
        public
        view
        returns (uint32[] memory positionIDs)
    {
        positionIDs = userPositions[_who];
    }

    ///@notice given an id, returns the position with that id. Returns emplty position if _id is not found or 0.
    ///@param _id: The id of the position you seek.
    function getsPosition(uint32 _id)
        public
        view
        returns (Position memory position)
    {
        position = getPositionById[_id];
    }
}
