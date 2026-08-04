import localFont from 'next/font/local';

const nanumSquare = localFont({
  src: [
    {
      path: './nanumSquare/NanumSquareB.otf',
      style: 'bold',
    },
    {
      path: './nanumSquare/NanumSquareR.otf',
      style: 'regular',
    },
  ],
});

export { nanumSquare };
