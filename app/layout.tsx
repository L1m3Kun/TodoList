import type { Metadata } from 'next';
import { nanumSquare } from '@/assets/fonts';
import './globals.css';
import { GlobalNavBar } from '@/components/gnb';

export const metadata: Metadata = {
  title: 'Codeit TodoList',
  description: '간편하게 할 일을 등록하고 기록할 수 있는 Todo 앱 입니다.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${nanumSquare.className} h-full antialiased`}>
      <body className="flex flex-col min-h-full">
        <GlobalNavBar />
        {children}
      </body>
    </html>
  );
}
