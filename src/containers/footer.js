import React, { useContext } from 'react';
import { MultisigContext } from './context';
import { DefaultLink } from './links';
import { buildBigmapLink, buildContractLink, buildContractOperationsLink } from './utils';


export function Footer() {
    const { contractAddress, storage } = useContext(MultisigContext);
    const links = [
        contractAddress && { label: 'contract', href: buildContractLink(contractAddress) },
        contractAddress && storage?.metadata && { label: `metadata bigmap ${storage.metadata}`, href: buildBigmapLink(storage.metadata, contractAddress) },
        contractAddress && storage?.proposals && { label: `proposals bigmap ${storage.proposals}`, href: buildBigmapLink(storage.proposals, contractAddress) },
        contractAddress && storage?.votes && { label: `votes bigmap ${storage.votes}`, href: buildBigmapLink(storage.votes, contractAddress) },
        contractAddress && { label: 'contract operations', href: buildContractOperationsLink(contractAddress) },
    ].filter(Boolean);

    return (
        <footer>
            <p>
                Created by the <a href='https://twitter.com/TeiaCommunity'>@TeiaCommunity</a> using <a href='https://reactjs.org'>React</a>,
                {' '}
                <a href='https://tezostaquito.io'>Taquito</a>, and the <a href='https://tzkt.io'>TzKT</a> API.
            </p>
            <p>Do not trust this UI without checking the linked contract, bigmaps, and operations.</p>
            <div className='footer-links'>
                {links.map(link => (
                    <DefaultLink key={link.label} href={link.href} className='footer-links__item'>
                        {link.label}
                    </DefaultLink>
                ))}
            </div>
        </footer>
    );
}
