import React from 'react';
import { SearchBar } from './SearchBar';
import { X } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-[#0C0C10] border border-[#2B2B36] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1E1E26]">
          <span className="font-brand text-sm font-semibold tracking-wider text-white">
            Maison RGD LUXE Global Search
          </span>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-[#16161D]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <SearchBar autoFocus onSelectProduct={onClose} />
      </div>
    </div>
  );
};
