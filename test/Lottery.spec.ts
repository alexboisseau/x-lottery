import hre, { ethers, network } from 'hardhat'; // HRE means Hardhat Runtime Environment
import { Contract, ContractFactory } from 'ethers';
import { expect } from 'chai';
import { parseEther } from 'ethers/lib/utils';

describe('Lottery', () => {
  let LotteryContractFactory: ContractFactory;
  let LotteryContract: Contract;
  let entranceFee = parseEther('0.1');

  /* VRF constants */
  const coordinatorAddress = '0x360d3cb7a189e469f68391bf0cf169025505b5ff';
  const gasLane =
    '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c';
  const subscriptionId = 1618;
  const callbackGasLimit = 10000000;

  beforeEach(async () => {
    const [player] = await ethers.getSigners();
    console.log('PLAYER : ', player);
    LotteryContractFactory = await hre.ethers.getContractFactory('Lottery');
    LotteryContract = await LotteryContractFactory.deploy(
      entranceFee,
      coordinatorAddress,
      gasLane,
      subscriptionId,
      callbackGasLimit
    );
  });

  it('should be deployed', () => {
    expect(LotteryContract).instanceOf(Contract);
  });

  it('entrance fee should be define and equal to the entranceFee variable value', async () => {
    const result = await LotteryContract.getEntranceFee();

    expect(result).equal(entranceFee);
  });

  it('should throw an error if msg.value is less than the entranceFee', async () => {
    await expect(
      LotteryContract.enterLottery({
        value: parseEther('0.09'),
      })
    ).to.be.revertedWithCustomError(
      LotteryContract,
      'Lottery__NotEnoughETHEntered'
    );
  });

  it('should push the player in the players array since the msg.value is equal to the entranceFee', async () => {
    await LotteryContract.enterLottery({
      value: entranceFee,
    });
    const players = await LotteryContract.getPlayers();

    expect(players.length).equal(1);
  });

  it('should emit a new event when a player enter in the lottery', async () => {
    await expect(
      LotteryContract.enterLottery({
        value: entranceFee,
      })
    ).to.emit(LotteryContract, 'LotteryEnter');
  });
});
