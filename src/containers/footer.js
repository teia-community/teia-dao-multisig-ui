import React, { useContext } from 'react';
import { MultisigContext } from './context';
import { DefaultLink } from './links';
import { buildBigmapLink, buildContractLink, buildContractOperationsLink, shortenAddress } from './utils';


export function Footer() {
    const { contractAddress, storage } = useContext(MultisigContext);
    const links = [
        contractAddress && storage?.metadata && { label: `metadata bigmap ${storage.metadata}`, href: buildBigmapLink(storage.metadata, contractAddress) },
        contractAddress && storage?.proposals && { label: `proposals bigmap ${storage.proposals}`, href: buildBigmapLink(storage.proposals, contractAddress) },
        contractAddress && storage?.votes && { label: `votes bigmap ${storage.votes}`, href: buildBigmapLink(storage.votes, contractAddress) },
    ].filter(Boolean);

    return (
        <footer className='app-footer'>
            <p className='app-footer__headline'>don't trust this UI - verify everything on-chain</p>
            <div className='app-footer__meta'>
                {contractAddress && (
                    <span>
                        contract <DefaultLink href={buildContractLink(contractAddress)} className='app-footer__inline-link'>{shortenAddress(contractAddress, 6, 5)}</DefaultLink>
                    </span>
                )}
                {contractAddress && (
                    <span>
                        <DefaultLink href={buildContractOperationsLink(contractAddress)} className='app-footer__inline-link'>operations on TzKT</DefaultLink>
                    </span>
                )}
                {links.map(link => (
                    <span key={link.label}>
                        <DefaultLink href={link.href} className='app-footer__inline-link'>{link.label}</DefaultLink>
                        {link !== links[links.length - 1] && " | "}
                    </span>
                ))}
            </div>
        </footer>
    );
}
