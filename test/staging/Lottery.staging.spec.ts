import { ethers, getNamedAccounts, network } from 'hardhat';
import { developmentChains } from '../../helper-hardhat.config';
import { Lottery } from '../../typechain-types';
import { BigNumber } from 'ethers';
import { assert, expect } from 'chai';

developmentChains.includes(network.name)
  ? describe.skip
  : describe('Lottery Staging Tests', function () {
      let lotteryContract: Lottery;
      let lotteryEntranceFee: BigNumber;
      let deployer: string;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        lotteryContract = await ethers.getContract('Lottery', deployer);
        lotteryEntranceFee = await lotteryContract.getEntranceFee();

        console.log(`DEPLOYER ADDRESS : `, deployer);
        console.log(`LOTTERY CONTRACT : `, lotteryContract.address);
      });

      describe('fulfillRandomWords', function () {
        it('works with live Chainlink Automation and Chainlink VRF, we get a random winner', async function () {
          console.log('Setting up test...');
          const startingTimeStamp = await lotteryContract.getLatestTimestamp();
          const accounts = await ethers.getSigners();

          console.log('Setting up Listener...');
          await new Promise<void>(async (resolve, reject) => {
            // setup listener before we enter the raffle
            // Just in case the blockchain moves REALLY fast
            lotteryContract.once('WinnerPicked', async () => {
              console.log('WinnerPicked event fired!');
              try {
                // add our asserts here
                const recentWinner = await lotteryContract.getRecentWinner();
                const lotteryState = await lotteryContract.getLotteryState();
                const winnerEndingBalance = await accounts[0].getBalance();
                const endingTimeStamp =
                  await lotteryContract.getLatestTimestamp();

                await expect(lotteryContract.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(lotteryState, 0);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(lotteryEntranceFee).toString()
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });
            // Then entering the lottery
            console.log('Entering Lottery...');
            const tx = await lotteryContract.enterLottery({
              value: lotteryEntranceFee,
            });
            await tx.wait(1);
            console.log('Ok, time to wait...');
            const winnerStartingBalance = await accounts[0].getBalance();

            // and this code WONT complete until our listener has finished listening!
          });
        });
      });
    });
