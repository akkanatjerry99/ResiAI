import React, { useMemo } from 'react';
import { Labs as PatientLabs, LabValue } from '../types';
import { motion } from 'framer-motion';
import { formatToBuddhistEra } from '../services/dateService';

interface LabTableViewProps {
  labs: PatientLabs;
}

interface TableRow {
  testName: string;
  unit: string | undefined;
  values: { [date: string]: string | number };
}

const LabTableView: React.FC<LabTableViewProps> = ({ labs }) => {
  const { tableHeaders, tableRows } = useMemo(() => {
    const allTestRows: { [key: string]: TableRow } = {};
    const dateSet = new Set<string>();

    const processLab = (
      testName: string,
      unit: string | undefined,
      values: LabValue[]
    ) => {
      if (!values || values.length === 0) return;

      if (!allTestRows[testName]) {
        allTestRows[testName] = { testName, unit, values: {} };
      }

      values.forEach(v => {
        if (!v.date) return;
        const dateKey = formatToBuddhistEra(v.date);
        dateSet.add(dateKey);
        allTestRows[testName].values[dateKey] = v.value;
      });
    };

    processLab('Creatinine', 'mg/dL', labs.creatinine);
    processLab('WBC', '10^3/uL', labs.wbc);
    processLab('Hemoglobin', 'g/dL', labs.hgb);
    processLab('Potassium', 'mmol/L', labs.k);
    processLab('Sodium', 'mmol/L', labs.sodium);
    if (labs.inr) processLab('INR', '', labs.inr);

    labs.others.forEach(otherLab => {
      processLab(otherLab.name, otherLab.unit, otherLab.values);
    });

    const sortedDates = Array.from(dateSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const tableHeaders = ['Test Name', 'Unit', ...sortedDates.map(d => formatToBuddhistEra(d))];
    const tableRows = Object.values(allTestRows).map(row => {
      return {
        ...row,
        orderedValues: sortedDates.map(date => row.values[date] || '--'),
      };
    }).sort((a, b) => a.testName.localeCompare(b.testName));

    return { tableHeaders, tableRows };
  }, [labs]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-glass-panel border border-glass-border rounded-2xl p-4 overflow-x-auto custom-scrollbar shadow-sm"
    >
      <table className="w-full min-w-[800px] text-sm text-left">
        <thead className="border-b-2 border-glass-border">
          <tr>
            {tableHeaders.map((header, i) => (
              <th key={i} className={`py-3 px-4 font-bold text-muted uppercase tracking-wider text-xs ${i > 1 ? 'text-center' : ''}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-glass-border">
          {tableRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-glass-depth transition-colors">
              <td className="py-2 px-4 font-medium text-main whitespace-nowrap">{row.testName}</td>
              <td className="py-2 px-4 text-muted whitespace-nowrap">{row.unit}</td>
              {row.orderedValues.map((value, valueIndex) => (
                <td key={valueIndex} className="py-2 px-4 text-center font-mono">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};

export default LabTableView;
