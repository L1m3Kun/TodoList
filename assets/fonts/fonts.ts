import localFont from 'next/font/local';

const nanumSquare = localFont({
  src: [
    {
      path: './nanumSquare/NanumSquareB.otf',
      weight: '700',
      style: 'bold',
    },
    {
      path: './nanumSquare/NanumSquareR.otf',
      weight: '400',
      style: 'regular',
    },
  ],
  preload: true,
  variable: '--font-nanum-squre',
});

export { nanumSquare };
