import { deployments, ethers, network } from 'hardhat';
import { developmentChains } from '../helper-hardhat.config';
import { Contract } from 'ethers';
import { expect } from 'chai';

if (developmentChains.includes(network.name)) {
  describe('Lottery Unit Tests', async function () {
    let lotteryContract: Contract;
    let vrfCoordinatorV2MockContract: Contract;

    this.beforeEach(async function () {
      await deployments.fixture('all'); // Deploy all contracts which have the tag 'all';
      lotteryContract = await ethers.getContract('Lottery');
      vrfCoordinatorV2MockContract = await ethers.getContract(
        'VRFCoordinatorV2Mock'
      );
    });

    describe('Deployments', function () {
      it('Lottery should be deployed', function () {
        expect(lotteryContract).instanceOf(Contract);
      });

      it('VRFCoordinatorV2Mock should be deployed', function () {
        expect(vrfCoordinatorV2MockContract).instanceOf(Contract);
      });
    });
  });
}
