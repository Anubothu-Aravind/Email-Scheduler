import type { ReactNode } from 'react';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

export const Table = <T,>({ columns, data, keyExtractor, emptyMessage = 'No data available' }: TableProps<T>) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              {/* Left side: render first two columns stacked if available */}
              <div className="flex items-center gap-4">
                <div className="min-w-0">
                  {columns[0] && (
                    <div className="text-sm font-medium text-gray-900">
                      {columns[0].render ? columns[0].render(item) : (item as any)[columns[0].key]}
                    </div>
                  )}
                  {columns[1] && (
                    <div className="text-xs text-gray-500 truncate">
                      {columns[1].render ? columns[1].render(item) : (item as any)[columns[1].key]}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: render remaining columns vertically */}
            <div className="flex flex-col items-end ml-4 space-y-1">
              {columns.slice(2).map((column) => (
                <div key={column.key} className="text-sm text-gray-600">
                  {column.render ? column.render(item) : (item as any)[column.key]}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};