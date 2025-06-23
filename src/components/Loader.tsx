import React from 'react';

const Loader: React.FC = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 9999
        }}>
            <div style={{ display: 'inline-block', position: 'relative', width: 80, height: 80 }}>
                <div style={{
                    boxSizing: 'border-box',
                    position: 'absolute',
                    border: '4px solid currentColor',
                    opacity: 1,
                    borderRadius: '50%',
                    animation: 'lds-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite'
                }}></div>
                <div style={{
                    boxSizing: 'border-box',
                    position: 'absolute',
                    border: '4px solid currentColor',
                    opacity: 1,
                    borderRadius: '50%',
                    animation: 'lds-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite',
                    animationDelay: '-0.5s'
                }}></div>
                <style>{`
                    @keyframes lds-ripple {
                        0% {
                            top: 36px;
                            left: 36px;
                            width: 8px;
                            height: 8px;
                            opacity: 0;
                        }
                        4.9% {
                            top: 36px;
                            left: 36px;
                            width: 8px;
                            height: 8px;
                            opacity: 0;
                        }
                        5% {
                            top: 36px;
                            left: 36px;
                            width: 8px;
                            height: 8px;
                            opacity: 1;
                        }
                        100% {
                            top: 0;
                            left: 0;
                            width: 80px;
                            height: 80px;
                            opacity: 0;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Loader;
