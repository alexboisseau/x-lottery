import hre from "hardhat"; // HRE means Hardhat Runtime Environment
import { Contract, ContractFactory } from "ethers";
import { expect } from "chai";

describe("Lottery", () => {
  let LotteryContractFactory: ContractFactory | null = null;
  let LotteryContract: Contract | null = null;

  beforeEach(async () => {
    LotteryContractFactory = await hre.ethers.getContractFactory("Lottery");
    LotteryContract = await LotteryContractFactory.deploy();
  });

  it("should be deployed", () => {
    expect(LotteryContract).instanceOf(Contract);
  });
});
