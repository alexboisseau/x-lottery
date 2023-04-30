// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import '@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/AutomationCompatible.sol';

error Lottery__NotEnoughETHEntered();
error Lottery__TransfertFailed();
error Lottery__NotOpen();

contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /* Type declaration */
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    /* State Variables */
    uint256 private immutable i_entranceFee; // i for immutable
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    /* Lottery variables */
    address payable s_recentWinner;
    address payable[] private s_players; // s for storage
    LotteryState private s_lotteryState;
    uint256 private s_lastTimestamp;
    uint256 private immutable i_interval;

    /* Events */
    event LotteryEnter(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);

    /* VRFConsumerBaseV2 take an address in his constructor, this is why we take the vrfCoordinatorV2 parameter in the Lottery Constructor*/
    constructor(
        uint256 _entranceFee,
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = _entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_lotteryState = LotteryState.OPEN;
        s_lastTimestamp = block.timestamp;
        i_interval = interval;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughETHEntered();
        }

        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__NotOpen();
        }

        s_players.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);
    }

    function requestRandomWinner() external returns (uint256) {
        s_lotteryState = LotteryState.CALCULATING;

        // Request the random number to the VRF
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedLotteryWinner(requestId);
        return requestId;
    }

    /**
     * @dev This is the function that ChainLink automation will call to see if the performUpkeep should be call.
     * Following need to be true to return true :
     *  1 - Our time interval have passed
     *  2 - The lottery should have at least 1 player and ETH
     *  3 - Our subscription is funded with LINK
     *  4 - The lottery should be in a OPEN state
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory /*performData*/)
    {
        bool isOpen = s_lotteryState == LotteryState.OPEN;
        bool timePassed = ((block.timestamp - s_lastTimestamp) > i_interval);
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(bytes calldata performData) external override {}

    //Callback which handle the random values after they are returned to your contract by the coordinator.
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_lotteryState = LotteryState.OPEN;
        s_players = new address payable[](0);
        (bool success, ) = recentWinner.call{value: address(this).balance}('');
        if (!success) {
            revert Lottery__TransfertFailed();
        }
    }

    /* View / Pure functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers() public view returns (address payable[] memory) {
        return s_players;
    }

    function getRecentWinner() public view returns (address payable) {
        return s_recentWinner;
    }
}
