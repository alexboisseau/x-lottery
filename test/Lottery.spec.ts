import hre from "hardhat"; // HRE means Hardhat Runtime Environment
import { Contract, ContractFactory } from "ethers";
import { expect } from "chai";

describe("Lottery", () => {
  let LotteryContractFactory: ContractFactory;
  let LotteryContract: Contract;
  let entranceFee = 10;

  beforeEach(async () => {
    LotteryContractFactory = await hre.ethers.getContractFactory("Lottery");
    LotteryContract = await LotteryContractFactory.deploy(entranceFee);
  });

  it("should be deployed", () => {
    expect(LotteryContract).instanceOf(Contract);
  });

  it("entrance fee should be define and equal to the entranceFee variable value", async () => {
    const result = await LotteryContract.getEntranceFee();

    expect(result).equal(entranceFee);
  });
});
