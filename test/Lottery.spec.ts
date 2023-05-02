import { deployments, ethers, network } from 'hardhat';
import { developmentChains, networkConfig } from '../helper-hardhat.config';
import { Contract } from 'ethers';
import { expect } from 'chai';

if (developmentChains.includes(network.name)) {
  describe('Lottery Unit Tests', async function () {
    let lotteryContract: Contract;
    let vrfCoordinatorV2MockContract: Contract;
    let chainId: number;

    this.beforeEach(async function () {
      await deployments.fixture('all'); // Deploy all contracts which have the tag 'all';
      lotteryContract = await ethers.getContract('Lottery');
      vrfCoordinatorV2MockContract = await ethers.getContract(
        'VRFCoordinatorV2Mock'
      );

      chainId = network.config.chainId!;
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

        expect(lotteryGasLane).equal(lotteryGasLane);
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
  });
}
