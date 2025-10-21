import React from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { Batch } from '../types';
import { exportBatchToPDF, exportAllBatchesToCSV } from '../utils/exportUtils';

interface ExportPanelProps {
  batches: Batch[];
  selectedBatch?: Batch | null;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ batches, selectedBatch }) => {
  const handleExportPDF = async (batch: Batch) => {
    try {
      await exportBatchToPDF(batch);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportAllCSV = () => {
    try {
      exportAllBatchesToCSV(batches);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Download className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
          <p className="text-sm text-gray-600">Download your batch data and reports</p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleExportAllCSV}
          disabled={batches.length === 0}
          className="w-full flex items-center gap-3 p-4 text-left bg-gray-50 hover:bg-gray-100 disabled:bg-gray-25 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <div className="p-2 bg-green-100 rounded-lg">
            <Table className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">Export All Batches (CSV)</div>
            <div className="text-sm text-gray-600">
              Download all batch data as a spreadsheet ({batches.length} batches)
            </div>
          </div>
        </button>

        {selectedBatch && (
          <button
            onClick={() => handleExportPDF(selectedBatch)}
            className="w-full flex items-center gap-3 p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Export Selected Batch (PDF)</div>
              <div className="text-sm text-gray-600">
                Download detailed report for {selectedBatch.cropType} - {selectedBatch.trayId}
              </div>
            </div>
          </button>
        )}

        {!selectedBatch && batches.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Select a batch from the list to export individual PDF reports
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportPanel;