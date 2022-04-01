import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import { useRouter } from 'next/router';
import Web3Modal from 'web3modal';

import { marketplaceAddress } from '../config';

import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json';
const marketplaceOwner = '0x1785C3c1EF94893b9391EC079a90c76B7e0C60B6';

export default function adminPage() {
    const [formInput, updateFormInput] = useState({fee: 'NADA'});
    const [fee, setFee] = useState('');
    const [contractBalance, setBalance] = useState('');
    const [sales, setSales] = useState('');
    const [admin, setAdmin] = useState(false);
    const [loadingState, setLoadingState] = useState('not-loaded');


    useEffect(() => {
        fetchAccountDetails();
    }, []);

    async function fetchAccountDetails() {
        
        const web3Modal = new Web3Modal({
            network: 'mainnet',
            cacheProvider: true,
        });

        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();

        const currentAddress = await signer.getAddress();
        console.log("Current address: ", currentAddress);

        if(currentAddress === marketplaceOwner) {
            setAdmin(true);
            await getListingFee();
            await getContractBalance();
            await getSales();
        }
        
        setLoadingState('loaded');
    }

    async function getListingFee() {
        const web3modal = new Web3Modal();
        const connection = await web3modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer);
        
        let listingFee = await contract.getListingFee();
        listingFee = ethers.utils.formatUnits(listingFee.toString(), 'ether');
        console.log("Listing fee: "+ listingFee + " Matic");
        setFee(listingFee);
    }


    async function updateListingFee() {
        const web3modal = new Web3Modal();
        const connection = await web3modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();

        const _updatedFee = ethers.utils.parseUnits(formInput._updatedFee.toString(), 'ether');
        const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer);
        let transaction = await contract.updateListingFee(_updatedFee);
        await transaction.wait();

        await getListingFee();
    }

    async function getContractBalance() {
        const web3modal = new Web3Modal();
        const connection = await web3modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer);

        let balance = await contract.getContractBalance();
        balance = ethers.utils.formatUnits(balance.toString(), 'ether');
        console.log("Contract Balance: " + balance + " Matic");
        setBalance(balance);
    }

    async function getSales() {
        const web3modal = new Web3Modal();
        const connection = await web3modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer);
        
        let _sales = await contract.getNoOfSales();
        _sales = _sales.toString();
        console.log("Contract Sales: ", _sales);
        setSales(_sales);
    }

    if(loadingState === 'loaded' && admin)
        return (
            <div className="flex justify-center">
                <div className="w-1/2 flex flex-col pb-12">
                    <input
                        placeholder="Listing fee in Matic"
                        className="mt-2 border rounded p-4"
                        onChange={e => updateFormInput({...formInput, fee: e.target.value})}
                    />
                    <button onClick={updateListingFee} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
                        Update Listing Fee
                    </button>
                </div>
            </div>
        );
    return (<h1 className="px-20 py-10 text-3xl">You aint supposed to be here!</h1>);
}