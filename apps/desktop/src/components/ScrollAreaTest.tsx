import React from 'react';
import { ScrollArea, Card, CardContent, CardHeader, CardTitle } from '@espice/ui';

export const ScrollAreaTest: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">ScrollArea Test</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vertical Scroll</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40 w-full border rounded">
              <div className="p-4 space-y-2">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="p-2 bg-muted rounded">
                    Item {i + 1}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horizontal Scroll</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-20 w-full border rounded">
              <div className="p-4 flex space-x-2" style={{ width: '800px' }}>
                {Array.from({ length: 15 }, (_, i) => (
                  <div key={i} className="p-2 bg-muted rounded flex-shrink-0 min-w-20">
                    Item {i + 1}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 