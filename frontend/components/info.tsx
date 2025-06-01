export function InfoMenu({
    setShowInfo,
}: {
    setShowInfo: (show: boolean) => void;
}) {
    return (
        <div className={'settings'}>
            <div>
                <h2>About</h2>
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
                <button type="button" onClick={() => setShowInfo(false)}>
                    Close
                </button>
            </div>
        </div>
    );
}
