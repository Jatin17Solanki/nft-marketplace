import { useState } from 'react';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import { useRouter } from 'next/router';
import Web3Modal from 'web3modal';


const client = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  // headers: {
  //   authorization: `Basic ${Buffer.from(projectIdAndSecret).toString('base64')}`,
  // },
});


import { marketplaceAddress } from '../config';

import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json';

export default function CreateItem() {

    const [fileUrl, setFileUrl] = useState('');
    const [formInput, updateFormInput] = useState({ price: '', name: '', description: ''});
    const router = useRouter();

    async function onChange(event) {

        //upload image to IPFS
        const file = event.target.files[0];
        try {
            const added = await client.add(
                file,
                {
                    progress: (prog) => console.log(`received: ${prog}`)
                }
            );
            const url = `https://ipfs.io/ipfs/${added.path}`;
            setFileUrl(url);
        } catch (error) {
            console.log('Error uploading file: ', error);
        }
    }


    async function uploadToIPFS() {
        const { name, description, price } = formInput;
        if(!name || !description || !price || !fileUrl)
            return ;

        const data = JSON.stringify({
            name, description, image: fileUrl
        });

        try {
            const added = await client.add(data);
            const url = `https://ipfs.io/ipfs/${added.path}`;
            return url;
        } catch (error) {
            console.log('Error uploading file: ', error)
        } 
    }


    async function listNFTForSale() {
        const url = await uploadToIPFS();
        const web3modal = new Web3Modal();
        const connection = await web3modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();

        //Create the NFT
        const price = ethers.utils.parseUnits(formInput.price.toString(), 'ether');
        let contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer);
        let listingFee = await contract.getListingFee();
        listingFee =  listingFee.toString();
        let transaction = await contract.createToken(url, price, {value: listingFee});
        await transaction.wait();

        router.push('/');
    }

    return (
        <div className="flex justify-center">
          <div className="w-1/2 flex flex-col pb-12">
            <input 
              placeholder="Asset Name"
              className="mt-8 border rounded p-4"
              onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
            />
            <textarea
              placeholder="Asset Description"
              className="mt-2 border rounded p-4"
              onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
            />
            <input
              placeholder="Asset Price in Eth"
              className="mt-2 border rounded p-4"
              onChange={e => updateFormInput({ ...formInput, price: e.target.value })}
            />
            <input
              type="file"
              name="Asset"
              className="my-4"
              onChange={onChange}
            />
            {
              fileUrl && (
                <img className="rounded mt-4" width="350" src={fileUrl} />
              )
            }
            <button onClick={listNFTForSale} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
              Create NFT
            </button>
          </div>
        </div>
      )
}
