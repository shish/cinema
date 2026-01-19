import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';

export function InfoMenu({ setShowInfo }: { setShowInfo: (show: boolean) => void }) {
    return (
        <div className={'settings'}>
            <div>
                <h2>
                    <div style={{ width: '1em' }} />
                    <div style={{ padding: '0 1em' }}>About</div>
                    <FAIcon
                        icon={faXmark}
                        onClick={() => setShowInfo(false)}
                        style={{
                            cursor: 'pointer',
                            height: '1em',
                        }}
                    />
                </h2>
                <p>
                    <a href={'https://github.com/shish/cinema'}>Cinema</a>
                    &nbsp;by&nbsp;
                    <a href={'mailto:s@shish.io'}>Shish</a>
                </p>
                <p className={'donate'}>
                    If you like this app and find it fun,
                    <br />
                    feel free to donate via <a href={'https://paypal.me/shish2k'}>PayPal</a>
                </p>
            </div>
        </div>
    );
}
