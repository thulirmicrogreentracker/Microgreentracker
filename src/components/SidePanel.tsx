import React, { useState, useRef, useEffect } from 'react';
import { Settings, BarChart3, ChevronLeft, ChevronRight, X } from 'lucide-react';

type PanelView = 'config' | 'reports' | null;

interface SidePanelProps {
  children: React.ReactNode;
  view: PanelView;
  onClose: () => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ children, view, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view) {
      setIsOpen(true);
      setIsCollapsed(false);
    } else {
      setIsOpen(false);
    }
  }, [view]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-panel-trigger]')) {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen && !view) return null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-50 transition-all duration-300 ease-in-out flex ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isCollapsed ? 'w-16' : 'w-full max-w-lg'}`}
        style={{ maxHeight: '100vh' }}
      >
        {/* Collapse toggle */}
        {isOpen && !isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="absolute -left-8 top-1/2 -translate-y-1/2 bg-white border border-r-0 border-gray-200 rounded-l-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {isCollapsed ? (
          <div className="flex flex-col items-center py-6 gap-4 w-full">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-px bg-gray-200" />
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Configuration"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Reports"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${view === 'config' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                  {view === 'config' ? (
                    <Settings className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {view === 'config' ? 'Configuration' : 'Reports'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {children}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SidePanel;
