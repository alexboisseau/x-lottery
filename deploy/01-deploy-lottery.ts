import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  VERIFICATION_BLOCK_CONFIRMATIONS,
  developmentChains,
  networkConfig,
} from '../helper-hardhat.config';
import { ethers } from 'hardhat';
import { BigNumberish } from 'ethers';
import verify from '../utils/verify';

export type LotteryArgs = [
  string,
  string,
  string,
  string,
  BigNumberish,
  string
];

const deployLottery: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  let vrfCoordinatorV2Address: string;
  let subscriptionId: string;

  if (chainId === 31337) {
    // Get vrfCoordinatorV2Mock address
    const vrfCoordinatorV2Mock = await ethers.getContract(
      'VRFCoordinatorV2Mock'
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

    // Create a subscription and fund it
    const createSubscriptionTransaction =
      await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await createSubscriptionTransaction.wait();
    subscriptionId = transactionReceipt.events[0].args.subId;
  } else {
    vrfCoordinatorV2Address =
      networkConfig[network.config.chainId!].vrfCoordinatorV2 ?? '';
    subscriptionId = networkConfig[network.config.chainId!].subscriptionId;
  }

  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;

  log('----------------------------------------------------');
  const args: LotteryArgs = [
    vrfCoordinatorV2Address!,
    subscriptionId,
    networkConfig[network.config.chainId!].gasLane,
    networkConfig[network.config.chainId!].keepersUpdateInterval,
    networkConfig[network.config.chainId!].lotteryEntranceFee,
    networkConfig[network.config.chainId!].callbackGasLimit,
  ];

  const lottery = await deploy('Lottery', {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: waitBlockConfirmations,
  });

  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
      'VRFCoordinatorV2Mock'
    );
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, lottery.address);
  }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    verify(lottery.address, args);
  }
};

export default deployLottery;
deployLottery.tags = ['all', 'lottery'];
