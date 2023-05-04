import { deployments, ethers, getNamedAccounts, network } from 'hardhat';
import { developmentChains, networkConfig } from '../helper-hardhat.config';
import { BigNumber, BigNumberish, Contract } from 'ethers';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

if (developmentChains.includes(network.name)) {
  describe('Lottery Unit Tests', function () {
    let deployer: string;
    let lotteryContract: Contract;
    let vrfCoordinatorV2MockContract: Contract;
    let chainId: number;
    let entranceFee: BigNumber;

    this.beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture('all'); // Deploy all contracts which have the tag 'all';
      lotteryContract = await ethers.getContract('Lottery', deployer);
      vrfCoordinatorV2MockContract = await ethers.getContract(
        'VRFCoordinatorV2Mock',
        deployer
      );
      await vrfCoordinatorV2MockContract.fundSubscription(
        networkConfig[network.config.chainId!].subscriptionId,
        ethers.utils.parseEther('1')
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

        const { upkeepNeeded } = await lotteryContract.checkUpkeep([]);
        expect(upkeepNeeded).equal(true);
      });
    });

    describe('PerformUpkeep', function () {
      it('should revert a custom error when upkeepNeeded value is falsy', async function () {
        await expect(
          lotteryContract.performUpkeep([])
        ).to.revertedWithCustomError(
          lotteryContract,
          'Lottery__UpkeepNotNeeded'
        );
      });

      it('should update the lottery state and emit an event', async function () {
        // ARRANGE
        const interval = await lotteryContract.getInterval();

        // ACT
        await lotteryContract.enterLottery({
          value: entranceFee,
        });
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ]);
        await network.provider.send('evm_mine', []);

        const transactionRequest = await lotteryContract.performUpkeep([]);
        const transactionReceipt = await transactionRequest.wait(1);
        const requestId = await transactionReceipt.events[1].args.requestId;
        const lotteryState = await lotteryContract.getLotteryState();

        // ASSERT
        expect(requestId.toNumber()).to.be.greaterThan(0);
        expect(lotteryState).equal(1);

        // Since performUpkeep will call the vrfCoordinator, we need to call
        // the fulfillRandomWords since the mock doesn't it to for us.
        await vrfCoordinatorV2MockContract.fulfillRandomWords(
          transactionReceipt.events[1].args.requestId,
          lotteryContract.address
        );
      });
    });

    describe('fulfillRandomWords', function () {
      let startingTimestamp: BigNumber;
      let players: {
        startingBalance: BigNumber;
        address: string;
      }[] = [];

      it('should reset lottery state, clear players array, update the latest timestamp and distribute fund', async function () {
        // Deployer enter into the lottery
        await lotteryContract.enterLottery({
          value: entranceFee,
        });

        // Increase the lottery
        const interval = await lotteryContract.getInterval();
        await network.provider.send('evm_increaseTime', [
          interval.toNumber() + 1,
        ]);
        await network.provider.request({ method: 'evm_mine', params: [] });

        // Add 3 players to the lottery
        const additionalEntrants = 3;
        const startingAccountIndex = 1; // 0 is the deployer
        const accounts = await ethers.getSigners();

        for (
          let i = startingAccountIndex;
          i < additionalEntrants + startingAccountIndex;
          i++
        ) {
          const account = accounts[i];
          const accountBalance = await account.getBalance();
          players.push({
            address: account.address,
            startingBalance: accountBalance,
          });
          const accountConnectedLottery = lotteryContract.connect(account);
          await accountConnectedLottery.enterLottery({
            value: entranceFee,
          });
        }

        startingTimestamp = await lotteryContract.getLatestTimestamp();

        await new Promise(async (resolve, reject) => {
          try {
            lotteryContract.once('WinnerPicked', async () => {
              try {
                const lotteryState = await lotteryContract.getLotteryState();
                const numberOfPlayers =
                  await lotteryContract.getNumberOfPlayers();

                expect(lotteryState).equal(0);
                expect(numberOfPlayers).equal(0);

                const recentWinner = await lotteryContract.getRecentWinner();
                const player = players.filter(
                  ({ address }) => address === recentWinner
                )[0];

                const recentWinnerSigner = await ethers.getSigner(recentWinner);
                const recentWinnerBalance =
                  await recentWinnerSigner.getBalance();

                expect(recentWinnerBalance.gt(player.startingBalance));
                resolve('Winner Picked Fireeeed');
              } catch (error) {
                reject(error);
              }
            });

            // Simulate the Chainlink automation which will call the targeted method (perfomUpkeep)
            const performUpkeepRequest = await lotteryContract.performUpkeep(
              []
            );
            const performUpkeepReceipt = await performUpkeepRequest.wait(1);

            // Simulate the vrf coordinator which receive random words from off chain service
            await vrfCoordinatorV2MockContract.fulfillRandomWords(
              performUpkeepReceipt.events[1].args.requestId,
              lotteryContract.address
            );
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });
}
