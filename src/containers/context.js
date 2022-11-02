import React, { createContext } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { Parser } from '@taquito/michel-codec';
import { validateAddress } from '@taquito/utils';
import { NETWORK, CONTRACT_ADDRESS, RPC_NODE } from '../constants';
import { InformationMessage, ConfirmationMessage, ErrorMessage } from './messages';
import * as utils from './utils';


// Initialize the tezos toolkit
const tezos = new TezosToolkit(RPC_NODE);

// Initialize the wallet
const wallet = new BeaconWallet({
    name: 'DAO multisig',
    preferredNetwork: NETWORK
});

// Pass the wallet to the tezos toolkit
tezos.setWalletProvider(wallet);

// Create the multisig context
export const MultisigContext = createContext();

// Create the multisig context provider component
export class MultisigContextProvider extends React.Component {

    constructor(props) {
        // Pass the properties to the base class
        super(props);

        // Define the component state parameters
        this.state = {
            // The user address
            userAddress: undefined,

            // The multisig contract address
            contractAddress: CONTRACT_ADDRESS,

            // The multisig contract storage
            storage: undefined,

            // The multisig contract mutez balance
            balance: undefined,

            // The multisig user aliases
            userAliases: undefined,

            // The multisig proposals
            proposals: undefined,

            // The user votes
            userVotes: undefined,

            // The multisig contract reference
            contract: undefined,

            // The information message
            informationMessage: undefined,

            // The confirmation message
            confirmationMessage: undefined,

            // The error message
            errorMessage: undefined,

            // Sets the information message
            setInformationMessage: (message) => this.setState({
                informationMessage: message
            }),

            // Sets the confirmation message
            setConfirmationMessage: (message) => this.setState({
                confirmationMessage: message
            }),

            // Sets the error message
            setErrorMessage: (message) => this.setState({
                errorMessage: message
            }),

            // Returns the multisig contract reference
            getContract: async () => {
                if (this.state.contract) {
                    return this.state.contract;
                }

                console.log('Accessing the multisig contract...');
                const contract = await utils.getContract(tezos, this.state.contractAddress);
                this.setState({ contract: contract });

                return contract;
            },

            // Connects the user wallet
            connectWallet: async () => {
                console.log('Connecting the user wallet...');
                await wallet.requestPermissions({ network: { type: NETWORK, rpcUrl: RPC_NODE } })
                    .catch(error => console.log('Error while requesting wallet permissions:', error));

                console.log('Accessing the user address...');
                const userAddress = await utils.getUserAddress(wallet);
                this.setState({ userAddress: userAddress });

                if (this.state.storage && userAddress) {
                    console.log('Downloading the user votes...');
                    const userVotes = await utils.getUserVotes(userAddress, this.state.storage.votes);
                    this.setState({ userVotes: userVotes });
                }
            },

            // Disconnects the user wallet
            disconnectWallet: async () => {
                // Clear the active account
                console.log('Disconnecting the user wallet...');
                await wallet.clearActiveAccount();

                // Reset the user related state parameters
                this.setState({
                    userAddress: undefined,
                    userVotes: undefined,
                    contract: undefined
                });
            },

            // Waits for an operation to be confirmed
            confirmOperation: async (operation) => {
                // Return if the operation is undefined
                if (operation === undefined) return;

                // Display the information message
                this.state.setInformationMessage('Waiting for the operation to be confirmed...');

                // Wait for the operation to be confirmed
                console.log('Waiting for the operation to be confirmed...');
                await operation.confirmation(1)
                    .then(() => console.log(`Operation confirmed: https://${NETWORK}.tzkt.io/${operation.opHash}`))
                    .catch(error => console.log('Error while confirming the operation:', error));

                // Remove the information message
                this.state.setInformationMessage(undefined);
            },

            // Creates a multisig proposal
            createProposal: async (entry_point, parameters) => {
                // Send the create proposal operation
                console.log('Sending the create proposal operation...');
                const operation = await entry_point(parameters).send()
                    .catch(error => console.log('Error while sending the create proposal operation:', error));

                // Wait for the confirmation
                await this.state.confirmOperation(operation);

                // Update the proposals
                const proposals = await utils.getBigmapKeys(this.state.storage.proposals);
                this.setState({ proposals: proposals });
            },

            // Creates a text proposal
            createTextProposal: async (ipfsPath) => {
                // Check that the IPFS path is not undefined
                if (!ipfsPath) {
                    this.state.setErrorMessage('The text proposal needs to be uploaded first to IPFS');
                    return;
                }

                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Create the text proposal
                this.state.createProposal(contract.methods.text_proposal, utils.stringToHex('ipfs://' + ipfsPath));
            },

            // Creates a transfer mutez proposal
            createTransferMutezProposal: async (transfers) => {
                // Loop over the transfers information
                let totalAmount = 0;

                for (const transfer of transfers) {
                    // Check that the destination address is a valid address
                    const destination = transfer.destination;

                    if (!(destination && validateAddress(destination) === 3)) {
                        this.state.setErrorMessage(`The provided address is not a valid tezos address: ${destination}`);
                        return;
                    }

                    totalAmount += transfer.amount;
                }

                // Check that the total amount is smaller thant the contract balance
                if (totalAmount > this.state.balance) {
                    this.state.setErrorMessage('The total amount of tez to transfer is larger than the current contract balance');
                    return;
                }

                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Create the transfer mutez proposal
                this.state.createProposal(contract.methods.transfer_mutez_proposal, transfers);
            },

            // Creates a transfer token proposal
            createTransferTokenProposal: async (tokenAddress, tokenId, transfers) => {
                // Check that the token contract address is a valid address
                if (!(tokenAddress && validateAddress(tokenAddress) === 3)) {
                    this.state.setErrorMessage(`The provided token contract address is not a valid tezos address: ${tokenAddress}`);
                    return;
                }

                // Loop over the transfers information
                for (const transfer of transfers) {
                    // Check that the destination address is a valid address
                    const destination = transfer.destination;

                    if (!(destination && validateAddress(destination) === 3)) {
                        this.state.setErrorMessage(`The provided address is not a valid tezos address: ${destination}`);
                        return;
                    }
                }

                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Create the transfer token proposal
                const parameters = {
                    fa2: tokenAddress,
                    token_id: tokenId,
                    distribution: transfers
                };
                this.state.createProposal(contract.methodsObject.transfer_token_proposal, parameters);
            },

            // Creates a minimum votes proposal
            createMinimumVotesProposal: async (minimumVotes) => {
                // Check that the minimum votes are within the expected range
                if (minimumVotes <= 0 || minimumVotes > this.state.storage?.users.length) {
                    this.state.setErrorMessage('The minimum votes need to be higher than 0 and less or equal to the number of multisig users');
                    return;
                }

                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Create the minimum votes proposal
                this.state.createProposal(contract.methods.minimum_votes_proposal, minimumVotes);
            },

            // Creates an expiration time proposal
            createExpirationTimeProposal: async (expirationTime) => {
                // Check that the expiration time is at least one day
                if (expirationTime <= 0) {
                    this.state.setErrorMessage('The expiration time needs to be at least one day');
                    return;
                }

                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Create the expiration time proposal
                this.state.createProposal(contract.methods.expiration_time_proposal, expirationTime);
            },

            // Creates an add user proposal
            createAddUserProposal: async (userAddress) => {
                // Check that the user address is a valid address
                if (!(userAddress && validateAddress(userAddress) === 3)) {
                    this.state.setErrorMessage(`The provided address is not a valid tezos address: ${userAddress}`);
                    return;
                }

                // Check that the user address is not in the multisig users
                if (this.state.storage?.users.includes(userAddress)) {
                    this.state.setErrorMessage('The provided address is already a multisig user');
                    return;
                }

                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Create the add user proposal
                this.state.createProposal(contract.methods.add_user_proposal, userAddress);
            },

            // Creates a remove user proposal
            createRemoveUserProposal: async (userAddress) => {
                // Check that the user address is a valid address
                if (!(userAddress && validateAddress(userAddress) === 3)) {
                    this.state.setErrorMessage(`The provided address is not a valid tezos address: ${userAddress}`);
                    return;
                }

                // Check that the user address is in the multisig users
                if (!this.state.storage?.users.includes(userAddress)) {
                    this.state.setErrorMessage('The provided address is not a multisig user');
                    return;
                }

                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Create the remove user proposal
                this.state.createProposal(contract.methods.remove_user_proposal, userAddress);
            },

            // Creates a lambda function proposal
            createLambdaFunctionProposal: async (michelineCode) => {
                // Try to get the lambda function from the Micheline code
                let lambdaFunction;

                try {
                    const parser = new Parser();
                    lambdaFunction = parser.parseMichelineExpression(michelineCode);
                } catch (error) {
                    this.state.setErrorMessage('The provided lambda function Michelson code is not correct');
                    return;
                }

                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Create the lambda function proposal
                this.state.createProposal(contract.methods.lambda_function_proposal, lambdaFunction);
            },

            // Votes a proposal
            voteProposal: async (proposalId, approval) => {
                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Send the vote proposal operation
                console.log('Sending the vote proposal operation...');
                const operation = await contract.methods.vote_proposal(proposalId, approval).send()
                    .catch(error => console.log('Error while sending the vote proposal operation:', error));

                // Wait for the confirmation
                await this.state.confirmOperation(operation);

                // Update the proposals and the user votes
                const storage = this.state.storage;
                const proposals = await utils.getBigmapKeys(storage.proposals);
                const userVotes = await utils.getUserVotes(this.state.userAddress, storage.votes);
                this.setState({
                    proposals: proposals,
                    userVotes: userVotes
                });
            },

            // Executes a proposal
            executeProposal: async (proposalId) => {
                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Send the execute proposal operation
                console.log('Sending the execute proposal operation...');
                const operation = await contract.methods.execute_proposal(proposalId).send()
                    .catch(error => console.log('Error while sending the execute proposal operation:', error));

                // Wait for the confirmation
                await this.state.confirmOperation(operation);

                // Update the storage, the balance, the user aliases and the proposals
                const storage = await utils.getContractStorage(this.state.contractAddress);
                const balance = await utils.getBalance(this.state.contractAddress);
                const userAliases = await utils.getUserAliases(storage.users);
                const proposals = await utils.getBigmapKeys(storage.proposals);
                this.setState({
                    storage: storage,
                    balance: balance,
                    userAliases: userAliases,
                    proposals: proposals
                });
            },

            // Accepts the multisig membership
            acceptMembership: async (accept) => {
                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Send the accept membership operation
                console.log('Sending the accept membership operation...');
                const operation = await contract.methods.accept_membership(accept).send()
                    .catch(error => console.log('Error while sending the accept membership operation:', error));

                // Wait for the confirmation
                await this.state.confirmOperation(operation);

                // Update the storage and the user aliases
                const storage = await utils.getContractStorage(this.state.contractAddress);
                const userAliases = await utils.getUserAliases(storage.users);
                this.setState({
                    storage: storage,
                    userAliases: userAliases
                });
            },

            // The user leaves the multisig
            leaveMultisig: async () => {
                // Get the multisig contract reference
                const contract = await this.state.getContract();

                // Return if the multisig contract reference is not available
                if (!contract) return;

                // Send the leave multisig operation
                console.log('Sending the leave multisig operation...');
                const operation = await contract.methods.leave_multisig().send()
                    .catch(error => console.log('Error while sending the leave multisig operation:', error));

                // Wait for the confirmation
                await this.state.confirmOperation(operation);

                // Update the storage and the user aliases
                const storage = await utils.getContractStorage(this.state.contractAddress);
                const userAliases = await utils.getUserAliases(storage.users);
                this.setState({
                    storage: storage,
                    userAliases: userAliases
                });
            },

            // Uploads some metadata to ipfs and returns the ipfs path
            uploadMetadataToIpfs: async (metadata, displayUploadInformation) => {
                // Display the information message
                if (displayUploadInformation) this.state.setInformationMessage('Uploading the json metadata to ipfs...');

                // Upload the metadata IPFS
                console.log('Uploading the json metadata to ipfs...');
                const added = await utils.uploadFileToIPFSProxy(new Blob([JSON.stringify(metadata)]))
                    .catch(error => console.log('Error while uploading the json metadata to ipfs:', error));

                // Remove the information message
                if (displayUploadInformation) this.state.setInformationMessage(undefined);

                // Return the IPFS path
                return added?.data.cid;
            },

            // Uploads a file to ipfs and returns the ipfs path
            uploadFileToIpfs: async (file, displayUploadInformation) => {
                // Check that the file is not undefined
                if (!file) {
                    this.state.setErrorMessage('A file needs to be loaded before uploading to IPFS');
                    return;
                }

                // Display the information message
                if (displayUploadInformation) this.state.setInformationMessage(`Uploading ${file.name} to ipfs...`);

                // Upload the file to IPFS
                console.log(`Uploading ${file.name} to ipfs...`);
                const added = await utils.uploadFileToIPFSProxy(file)
                    .catch(error => console.log(`Error while uploading ${file.name} to ipfs:`, error));

                // Remove the information message
                if (displayUploadInformation) this.state.setInformationMessage(undefined);

                // Return the IPFS path
                return added?.data.cid;
            }
        };

        // Loads all the needed information at once
        this.loadInformation = async () => {
            // Initialize the new state dictionary
            const newState = {}

            console.log('Accessing the user address...');
            const userAddress = await utils.getUserAddress(wallet);
            newState.userAddress = userAddress;

            console.log('Downloading the multisig contract storage...');
            const storage = await utils.getContractStorage(this.state.contractAddress);
            newState.storage = storage;

            console.log('Getting the multisig tez balance...');
            const balance = await utils.getBalance(this.state.contractAddress);
            newState.balance = balance;

            if (storage) {
                console.log('Downloading the multisig user aliases...');
                const userAliases = await utils.getUserAliases(storage.users.concat(storage.proposed_users));
                newState.userAliases = userAliases;

                console.log('Downloading the multisig proposals...');
                const proposals = await utils.getBigmapKeys(storage.proposals);
                newState.proposals = proposals;

                if (userAddress) {
                    console.log('Downloading the user votes...');
                    const userVotes = await utils.getUserVotes(userAddress, storage.votes);
                    newState.userVotes = userVotes;
                }
            }

            // Update the component state
            this.setState(newState);
        };
    }

    componentDidMount() {
        // Load all the relevant information
        this.loadInformation();
    }

    render() {
        return (
            <MultisigContext.Provider value={this.state}>
                {this.state.informationMessage &&
                    <InformationMessage message={this.state.informationMessage} />
                }

                {this.state.confirmationMessage &&
                    <ConfirmationMessage message={this.state.confirmationMessage} onClick={() => this.state.setConfirmationMessage(undefined)} />
                }

                {this.state.errorMessage &&
                    <ErrorMessage message={this.state.errorMessage} onClick={() => this.state.setErrorMessage(undefined)} />
                }

                {this.props.children}
            </MultisigContext.Provider>
        );
    }
}
