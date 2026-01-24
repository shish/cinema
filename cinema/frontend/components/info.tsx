import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FAIcon } from '@shish2k/react-faicon';

export function InfoMenu({ setShowInfo }: { setShowInfo: (show: boolean) => void }) {
    return (
        <div className={'dialog-overlay'}>
            <div className={'dialog info-dialog'}>
                <h2>
                    <div style={{ width: '1em' }} />
                    <div>
                        <a href={'https://github.com/shish/cinema'}>Cinema</a>
                        &nbsp;by&nbsp;
                        <a href={'mailto:s@shish.io'}>Shish</a>
                    </div>
                    <FAIcon
                        icon={faXmark}
                        onClick={() => setShowInfo(false)}
                        style={{
                            cursor: 'pointer',
                            height: '1em',
                        }}
                    />
                </h2>
                <p className={'donate'}>
                    If you like this app and find it fun, feel
                    <br />
                    free to donate via <a href="https://ko-fi.com/shish2k">KoFi</a> or{' '}
                    <a href={'https://paypal.me/shish2k'}>PayPal</a>
                </p>
            </div>
        </div>
    );
}
