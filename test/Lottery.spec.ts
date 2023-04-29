import hre from "hardhat"; // HRE means Hardhat Runtime Environment
import { Contract, ContractFactory } from "ethers";
import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";

describe("Lottery", () => {
  let LotteryContractFactory: ContractFactory;
  let LotteryContract: Contract;
  let entranceFee = parseEther("0.1");

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

  it("should throw an error if msg.value is less than the entranceFee", async () => {
    await expect(
      LotteryContract.enterLottery({
        value: parseEther("0.09"),
      })
    ).to.be.revertedWithCustomError(
      LotteryContract,
      "Lottery__NotEnoughETHEntered"
    );
  });

  it("should push the player in the players array since the msg.value is equal to the entranceFee", async () => {
    await LotteryContract.enterLottery({
      value: entranceFee,
    });
    const players = await LotteryContract.getPlayers();

    expect(players.length).equal(1);
  });
});
