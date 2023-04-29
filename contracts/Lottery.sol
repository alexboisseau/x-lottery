// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

contract Lottery {
  uint256 private immutable i_entranceFee; // i for immutable

  constructor(uint256 _entranceFee) {
    i_entranceFee = _entranceFee;
  }

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }
}