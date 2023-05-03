import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { developmentChains, networkConfig } from '../helper-hardhat.config';
import { BigNumberish, Contract } from 'ethers';
import { expect } from 'chai';

if (developmentChains.includes(network.name)) {
  describe('Lottery Unit Tests', function () {
    let deployer: string;
    let lotteryContract: Contract;
    let vrfCoordinatorV2MockContract: Contract;
    let chainId: number;
    let entranceFee: BigNumberish;

    this.beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture('all'); // Deploy all contracts which have the tag 'all';
      lotteryContract = await ethers.getContract('Lottery', deployer);
      vrfCoordinatorV2MockContract = await ethers.getContract(
        'VRFCoordinatorV2Mock',
        deployer
      );

      chainId = network.config.chainId!;
      entranceFee = networkConfig[chainId].lotteryEntranceFee;
    });

    describe('Deployments', function () {
      it('Lottery should be deployed', function () {
        expect(lotteryContract).instanceOf(Contract);
      });

      it('VRFCoordinatorV2Mock should be deployed', function () {
        expect(vrfCoordinatorV2MockContract).instanceOf(Contract);
      });
    });

    describe('Constructor', function () {
      it(`Lottery entrance fee should be equal to ${
        networkConfig[network.config.chainId!].lotteryEntranceFee
      }`, async function () {
        const expectedResult = networkConfig[chainId].lotteryEntranceFee;
        const lotteryEntranceFee = await lotteryContract.getEntranceFee();

        expect(lotteryEntranceFee).equal(expectedResult);
      });

      it(`Lottery gas lane shoud be equal to ${
        networkConfig[network.config.chainId!].gasLane
      }`, async function () {
        const expectedResult = networkConfig[chainId!].gasLane;
        const lotteryGasLane = await lotteryContract.getGasLane();

        expect(lotteryGasLane).equal(expectedResult);
      });

      it(`Lottery subscriptionId should be equal to ${
        networkConfig[network.config.chainId!].subscriptionId
      }`, async function () {
        const expectedResult = networkConfig[chainId].subscriptionId;
        const lotterySubscriptionId = await lotteryContract.getSubscriptionId();
        expect(lotterySubscriptionId).equal(expectedResult);
      });

      it(`Lottery callback gas limit should be equal to ${
        networkConfig[network.config.chainId!].callbackGasLimit
      }`, async function () {
        const expectedResult = networkConfig[chainId].callbackGasLimit;
        const lotteryCallbackGasLimit =
          await lotteryContract.getCallbackGasLimit();

        expect(lotteryCallbackGasLimit).equal(expectedResult);
      });

      it('Lottery state should be open', async function () {
        // In the smart contract, lottery state is an enum so OPEN = 0 and CALCULATING = 1
        const expectedResult = 0;
        const lotteryState = await lotteryContract.getLotteryState();

        expect(lotteryState).equal(expectedResult);
      });

      it(`Lottery interval should be equal to ${
        networkConfig[network.config.chainId!].keepersUpdateInterval
      }`, async function () {
        const expectedResult = networkConfig[chainId].keepersUpdateInterval;
        const lotteryInterval = await lotteryContract.getInterval();

        expect(lotteryInterval).equal(expectedResult);
      });
    });

    describe('Enter Lottery', function () {
      it("reverts when you don't pay enough", async function () {
        await expect(lotteryContract.enterLottery()).to.revertedWithCustomError(
          lotteryContract,
          'Lottery__NotEnoughETHEntered'
        );
      });

      it('player should be registered', async function () {
        await lotteryContract.enterLottery({
          value: entranceFee,
        });
        const registeredPlayer = await lotteryContract.getPlayer(0);

        expect(registeredPlayer).equal(deployer);
      });

      it('emits event on enter', async function () {
        await expect(
          lotteryContract.enterLottery({
            value: entranceFee,
          })
        ).to.emit(lotteryContract, 'LotteryEnter');
      });

      it('doesnt allow entrance when lottery is calculating', async function () {
        // In the smart contract, lottery state is an enum so OPEN = 0 and CALCULATING = 1
        await lotteryContract.enterLottery({
          value: entranceFee,
        });
        const interval = await lotteryContract.getInterval();

        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ]);

        // Will be automatic in the future thanks chainlink automation
        await lotteryContract.performUpkeep([]);

        await expect(
          lotteryContract.enterLottery({
            value: entranceFee,
          })
        ).to.revertedWithCustomError(lotteryContract, 'Lottery__NotOpen');
      });
    });

    describe('CheckUpkeep', function () {
      it('returns false lottery is not open', async function () {
        await lotteryContract.enterLottery({
          value: entranceFee,
        });
        const interval = await lotteryContract.getInterval();

        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ]);

        await lotteryContract.performUpkeep([]);

        const { upkeepNeeded } = await lotteryContract.checkUpkeep([]);
        expect(upkeepNeeded).equal(false);
      });

      it("returns false if enough time hasn't passed", async function () {
        await lotteryContract.enterLottery({
          value: entranceFee,
        });
        const interval = await lotteryContract.getInterval();

        await network.provider.send('evm_increaseTime', [
          interval.toNumber() - 1,
        ]);

        const { upkeepNeeded } = await lotteryContract.checkUpkeep([]);
        expect(upkeepNeeded).equal(false);
      });

      it('returns false if the players array is empty', async function () {
        const interval = await lotteryContract.getInterval();

        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ]);
        await network.provider.send('evm_mine', []);

        const { upkeepNeeded } = await lotteryContract.checkUpkeep([]);
        expect(upkeepNeeded).equal(false);
      });

      it('returns true if enough time has passed, has players and is open', async function () {
        await lotteryContract.enterLottery({
          value: entranceFee,
        });
        const interval = await lotteryContract.getInterval();

        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ]);
        await network.provider.send('evm_mine', []);

        const players = await lotteryContract.getNumberOfPlayers();
        console.log('PLAYERS : ', players.toNumber());

        const { upkeepNeeded } = await lotteryContract.checkUpkeep([]);
        expect(upkeepNeeded).equal(true);
      });
    });
  });
}
