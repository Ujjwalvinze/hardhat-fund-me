const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe;
          let deployer;
          let mockV3Aggregator;

          const sendValue = ethers.utils.parseEther("1"); // 1ETH or 1e18 wei
          beforeEach(async function () {
              // deploy fundme contract using hardhat deploy
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              fundMe = await ethers.getContract("FundMe", deployer);
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              );
          });

          describe("contracts", function () {
              it("Sets the aggregator address correctly", async function () {
                  const response = await fundMe.getPriceFeed();
                  assert.equal(response, mockV3Aggregator.address);
              });
          });

          describe("fund", function () {
              // thats why not sending any eth value in fund() function
              it('To check if "check for enough eth" works', async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Didn't send enough"
                  );
              });

              it("To check if address to amount funded is being updated", async function () {
                  await fundMe.fund({ value: sendValue });
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  );

                  assert.equal(response.toString(), sendValue.toString());
              });

              it("Checking the Funders array", async function () {
                  await fundMe.fund({ value: sendValue });
                  const funder = await fundMe.getFunder(0);

                  assert.equal(funder, deployer);
              });

              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue });
              });
              it("Withdraw function for a single funder", async function () {
                  //arrange
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address);
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer);

                  //act
                  const transactionResponse = await fundMe.withdraw();
                  const transactionReciept = await transactionResponse.wait(1);

                  const { gasUsed, effectiveGasPrice } = transactionReciept;
                  const gasFees = gasUsed.mul(effectiveGasPrice);

                  //assert
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  );
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer);

                  assert(endingFundMeBalance, 0);
                  assert(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(), // bignumber.add()
                      endingDeployerBalance.add(gasFees).toString() // the gasFees has to be paid when deployer called the withdraw function
                  );
              });

              it("Withdraw from multiple getFunder", async function () {
                  // arrange
                  const accounts = await ethers.getSigners();
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      );

                      await fundMeConnectedContract.fund({ value: sendValue });
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address);
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer);

                  //act
                  const transactionResponse = await fundMe.withdraw();
                  const transactionReciept = await transactionResponse.wait(1);
                  const { gasUsed, effectiveGasPrice } = transactionReciept;
                  const gasFees = gasUsed.mul(effectiveGasPrice);

                  //assert
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  );
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer);
                  assert(endingFundMeBalance, 0);
                  assert(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(), // bignumber.add()
                      endingDeployerBalance.add(gasFees).toString() // the gasFees has to be paid when deployer called the withdraw function
                  );

                  // make sure that getFunder array is empty
                  await expect(fundMe.getFunder(0)).to.be.reverted;

                  //make sure that all addressses have 0 amount
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      );
                  }
              });

              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners();
                  const attacker = await accounts[1];
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  );

                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner");
              });

              it("Testing cheaperWithdraw", async function () {
                  // arrange
                  const accounts = await ethers.getSigners();
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      );

                      await fundMeConnectedContract.fund({ value: sendValue });
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address);
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer);

                  //act
                  const transactionResponse = await fundMe.cheaperWithdraw();
                  const transactionReciept = await transactionResponse.wait(1);
                  const { gasUsed, effectiveGasPrice } = transactionReciept;
                  const gasFees = gasUsed.mul(effectiveGasPrice);

                  //assert
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  );
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer);
                  assert(endingFundMeBalance, 0);
                  assert(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(), // bignumber.add()
                      endingDeployerBalance.add(gasFees).toString() // the gasFees has to be paid when deployer called the withdraw function
                  );

                  // make sure that getFunder array is empty
                  await expect(fundMe.getFunder(0)).to.be.reverted;

                  //make sure that all addressses have 0 amount
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      );
                  }
              });
          });
      });

//0x70997970C51812dc3A010C7d01b50e0d17dc79C8
