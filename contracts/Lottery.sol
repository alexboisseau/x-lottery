// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

error Lottery__NotEnoughETHEntered();

contract Lottery {
  /* State Variables */
  uint256 private immutable i_entranceFee; // i for immutable
  address payable[] private s_players; // s for storage

  constructor(uint256 _entranceFee) {
    i_entranceFee = _entranceFee;
  }

  function enterLottery() public payable {
    if (msg.value < i_entranceFee) {
      revert Lottery__NotEnoughETHEntered();
    }

    s_players.push(payable(msg.sender));
  }

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getPlayers() public view returns (address payable[] memory) {
    return s_players;
  }
}