'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { logout } from '@/app/_lib/session/logout';

type UserMenuProps = {
  name: string;
  email: string;
  isAdmin: boolean;
};

export function UserMenu({ name, email, isAdmin }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [openedPath, setOpenedPath] = useState<string | null>(null);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // 다른 페이지로 이동하면 메뉴를 닫는다
  if (open && openedPath !== pathname) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggle = () => {
    setOpenedPath(pathname);
    setOpen((value) => !value);
  };

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="user-menu__trigger"
        aria-label={`${name}님 계정 메뉴`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5" />
        </svg>
      </button>

      <div className="user-menu__panel" id={panelId} hidden={!open}>
        <div className="user-menu__profile">
          <strong>{name}님</strong>
          <span>{email}</span>
        </div>
        <Link className="user-menu__item" href={isAdmin ? '/admin' : '/my'}>
          {isAdmin ? '관리자 페이지' : '마이페이지'}
        </Link>
        <form action={logout}>
          <button className="user-menu__item" type="submit">
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
