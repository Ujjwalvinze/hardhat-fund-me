const {
    networkConfig,
    developmentChains,
} = require("../helper-hardhat-config");
/*
this is -- 
const helperConfig = require("../helper-hardhat-config");
const networkConfig = helperConfig.networkConfig
*/
const { network } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // if chainid is y use address x;
    // if chainid is z use address a;

    let ethUsdPriceFeedAddress; // = networkConfig[chainId]["ethUsedPriceFeed"];

    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator");
        ethUsdPriceFeedAddress = ethUsdAggregator.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
    }

    const args = [ethUsdPriceFeedAddress];

    const fundMe = await deploy("FundMe", {
        from: deployer, // represents the address which is passed in verify
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, args);
    }

    log("---------------------------------");
};

module.exports.tags = ["all", "fundme"];
