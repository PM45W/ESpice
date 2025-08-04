import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const DatabasePage: React.FC = () => {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<any | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    invoke('get_pdfs').then((res: string) => setPdfs(JSON.parse(res)));
  }, []);

  const handleSelectPdf = async (pdf: any) => {
    setSelectedPdf(pdf);
    const pdfPages = await invoke('get_pages', { pdfId: pdf.id });
    setPages(JSON.parse(pdfPages as string));
    setDetails(null);
  };

  const handleSelectPage = async (page: any) => {
    const pageDetails = await invoke('get_page_details', { pageId: page.id });
    setDetails(JSON.parse(pageDetails as string));
  };

  return (
    <div className="flex h-full">
      {/* Sidebar: PDFs */}
      <div className="w-64 border-r p-4">
        <h2 className="font-bold mb-2">PDF Documents</h2>
        <ul>
          {pdfs.map(pdf => (
            <li key={pdf.id}>
              <button className="text-left w-full" onClick={() => handleSelectPdf(pdf)}>
                {pdf.filename}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Main: Pages and Details */}
      <div className="flex-1 p-4">
        {selectedPdf && (
          <>
            <h3 className="font-semibold mb-2">Pages for {selectedPdf.filename}</h3>
            <ul className="flex space-x-2 mb-4">
              {pages.map(page => (
                <li key={page.id}>
                  <button className="px-2 py-1 bg-background hover:bg-muted rounded transition-colors" onClick={() => handleSelectPage(page)}>
                    Page {page.pageNumber}
                  </button>
                </li>
              ))}
            </ul>
            {details && (
              <div>
                <h4 className="font-semibold">Text Blocks</h4>
                <ul>
                  {details.textBlocks.map((block: any) => (
                    <li key={block.id}>{block.text}</li>
                  ))}
                </ul>
                <h4 className="font-semibold mt-4">Tables</h4>
                <ul>
                  {details.tables.map((table: any) => (
                    <li key={table.id} className="mb-2">
                      <div>Headers: {JSON.stringify(table.headers)}</div>
                      <div>Rows: {JSON.stringify(table.rows)}</div>
                      <div>Parameters: {table.parameters.map((p: any) => `${p.name}: ${p.value} ${p.unit}`).join(', ')}</div>
                    </li>
                  ))}
                </ul>
                <h4 className="font-semibold mt-4">Images</h4>
                <ul>
                  {details.images.map((img: any) => (
                    <li key={img.id} className="mb-2">
                      <div>Type: {img.type}</div>
                      <div>
                        {img.data && (
                          <img
                            src={`data:image/png;base64,${Buffer.from(img.data).toString('base64')}`}
                            alt="extracted"
                            style={{ maxWidth: 200 }}
                          />
                        )}
                      </div>
                      {img.graph && <div>Graph Data: {JSON.stringify(img.graph.extractedData)}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 