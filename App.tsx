
import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCodeStyling from 'qr-code-styling';
import Papa from 'papaparse';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { 
  Layers, 
  Palette, 
  ExternalLink,
  Facebook,
  Twitter,
  Instagram,
  RefreshCw,
  Plus,
  Eye,
  Maximize,
  FileText,
  Download,
  Upload,
  Table as TableIcon,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Settings2
} from 'lucide-react';
import { 
  Accordion, 
  Button, 
  Input, 
  Label, 
  Card 
} from './components/UI';
import { 
  DATA_TYPES, 
  DOT_STYLES, 
  CORNER_SQUARE_STYLES, 
  CORNER_DOT_STYLES,
  SOCIAL_LOGOS 
} from './constants';
import { QRConfig } from './types';

interface MappedFields {
  url: string;
  firstName: string;
  lastName: string;
  platform: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [activeType, setActiveType] = useState<string>('URL');
  const [colorMode, setColorMode] = useState<'single' | 'gradient'>('single');
  const [gradientColor2, setGradientColor2] = useState('#0277bd');
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [isCustomEyeColor, setIsCustomEyeColor] = useState(false);
  const [isTransparent, setIsTransparent] = useState(true); 
  const [exportSize, setExportSize] = useState(1000);
  
  // Single QR Naming States
  const [singleFirstName, setSingleFirstName] = useState('');
  const [singleLastName, setSingleLastName] = useState('');
  const [singlePlatform, setSinglePlatform] = useState('');

  // Bulk States
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkHeaders, setBulkHeaders] = useState<string[]>([]);
  const [mappedFields, setMappedFields] = useState<MappedFields>({
    url: '',
    firstName: '',
    lastName: '',
    platform: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [logoPixelSize, setLogoPixelSize] = useState(100);

  const [config, setConfig] = useState<QRConfig>({
    data: 'https://www.google.com',
    width: 300,
    height: 300,
    margin: 10,
    dotsOptions: {
      color: '#000000',
      type: 'square',
    },
    backgroundOptions: {
      color: 'transparent',
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.3,
      margin: 0,
      crossOrigin: 'anonymous',
      backgroundOptions: {
        color: 'transparent'
      },
      imageBackground: 'transparent'
    },
    cornersSquareOptions: {
      color: '#000000',
      type: 'square',
    },
    cornersDotOptions: {
      color: '#000000',
      type: 'square',
    },
    image: undefined,
  });

  const [qrCode] = useState<QRCodeStyling>(new QRCodeStyling({
    ...config,
    type: 'svg'
  }));
  
  const [bulkSampleQr] = useState<QRCodeStyling>(new QRCodeStyling({
    ...config,
    type: 'svg'
  }));
  
  const qrRef = useRef<HTMLDivElement>(null);
  const bulkSampleRef = useRef<HTMLDivElement>(null);

  const normalizeUrl = (url: string) => {
    if (!url) return "";
    const str = String(url).trim();
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return str;
    }
    return `https://${str}`;
  };

  const computedConfig = useMemo(() => {
    const options: any = {
      ...config,
      width: 300,
      height: 300,
      backgroundOptions: {
        ...config.backgroundOptions,
        color: isTransparent ? 'transparent' : (config.backgroundOptions.color || '#ffffff')
      },
      dotsOptions: {
        ...config.dotsOptions
      },
      imageOptions: {
        ...config.imageOptions,
        imageSize: Math.min(logoPixelSize / 300, 0.5),
        margin: 0,
        hideBackgroundDots: true,
        backgroundOptions: {
          color: 'transparent'
        },
        imageBackground: 'transparent'
      },
      cornersSquareOptions: { ...config.cornersSquareOptions },
      cornersDotOptions: { ...config.cornersDotOptions }
    };

    if (colorMode === 'gradient') {
      options.dotsOptions.gradient = {
        type: gradientType,
        rotation: 0,
        colorStops: [
          { offset: 0, color: config.dotsOptions.color },
          { offset: 1, color: gradientColor2 },
        ],
      };
    } else {
      delete options.dotsOptions.gradient;
    }

    if (!isCustomEyeColor) {
      options.cornersSquareOptions.color = config.dotsOptions.color;
      options.cornersDotOptions.color = config.dotsOptions.color;
    }

    return options;
  }, [config, colorMode, gradientColor2, gradientType, isCustomEyeColor, isTransparent, logoPixelSize]);

  useEffect(() => {
    qrCode.update(computedConfig);
    
    if (bulkRows.length > 0 && mappedFields.url) {
      const sampleUrl = bulkRows[0][mappedFields.url];
      if (sampleUrl) {
        bulkSampleQr.update({
          ...computedConfig,
          data: normalizeUrl(sampleUrl)
        });
      }
    }
  }, [computedConfig, qrCode, bulkSampleQr, bulkRows, mappedFields]);

  useEffect(() => {
    if (activeTab === 'single' && qrRef.current) {
      qrRef.current.innerHTML = '';
      qrCode.append(qrRef.current);
    }
  }, [qrCode, activeTab]);

  useEffect(() => {
    if (activeTab === 'bulk' && bulkSampleRef.current && bulkRows.length > 0 && mappedFields.url) {
      bulkSampleRef.current.innerHTML = '';
      bulkSampleQr.append(bulkSampleRef.current);
    }
  }, [bulkSampleQr, activeTab, bulkRows, mappedFields]);

  const processSvgString = (svgText: string, size: number): string => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = xmlDoc.querySelector('svg');

    if (svgElement) {
      svgElement.setAttribute('width', size.toString());
      svgElement.setAttribute('height', size.toString());
      svgElement.setAttribute('viewBox', `0 0 ${size} ${size}`);
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      return new XMLSerializer().serializeToString(xmlDoc);
    }
    return svgText;
  };

  const handleDownload = async (ext: 'png' | 'svg' | 'webp') => {
    const nameParts = [singleFirstName, singleLastName, singlePlatform].map(p => p.trim()).filter(Boolean);
    const filename = nameParts.length > 0 ? nameParts.join(' ') : 'QR Code Elite Generator';

    const size = Math.floor(exportSize);
    const logoRatio = Math.min(logoPixelSize / 300, 0.5);
    const scaledMargin = Math.floor(config.margin * (size / 300));

    const downloadQr = new QRCodeStyling({
      ...computedConfig,
      width: size,
      height: size,
      margin: scaledMargin,
      type: 'svg',
      imageOptions: {
        ...computedConfig.imageOptions,
        imageSize: logoRatio,
        margin: 0,
        imageBackground: 'transparent'
      }
    });

    try {
      const blob = await downloadQr.getRawData('svg');
      if (!blob) return;

      const svgText = await (blob as Blob).text();
      const processedSvg = processSvgString(svgText, size);

      if (ext === 'svg') {
        const finalBlob = new Blob([processedSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(finalBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.svg`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        const svgUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(processedSvg)));
        
        img.onload = () => {
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          canvas.toBlob((resultBlob) => {
            if (resultBlob) {
              const url = URL.createObjectURL(resultBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${filename}.${ext}`;
              link.click();
              URL.revokeObjectURL(url);
            }
          }, `image/${ext === 'webp' ? 'webp' : 'png'}`);
        };
        img.src = svgUrl;
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Ошибка при сохранении файла.");
    }
  };

  const handleFileUploadRaw = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            // PAPAPARSE: results.meta.fields handles all columns in the first row.
            const headers = results.meta.fields?.map((h, i) => h.trim() || `Колонка ${i + 1}`) || 
                            Object.keys(results.data[0] || {}).map((h, i) => h.trim() || `Колонка ${i + 1}`);
            setBulkHeaders(headers);
            setBulkRows(results.data);
            autoMapFields(headers);
          }
        },
        error: () => alert("Ошибка при чтении CSV.")
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          
          // ROBUST EXCEL HEADER EXTRACTION:
          // Instead of relying on data rows which might be sparse, we use the worksheet range
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
          const headers: string[] = [];
          
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
            const cell = ws[cellAddress];
            const headerVal = cell ? String(cell.v).trim() : '';
            // If header is empty, use Excel-style Column name (A, B, C...)
            headers.push(headerVal || `Колонка ${XLSX.utils.encode_col(C)}`);
          }

          const data = XLSX.utils.sheet_to_json(ws);
          if (headers.length > 0) {
            setBulkHeaders(headers);
            setBulkRows(data);
            autoMapFields(headers);
          } else {
            alert("Файл пуст или поврежден.");
          }
        } catch (err) {
          console.error(err);
          alert("Ошибка при обработке Excel файла.");
        }
      };
      reader.readAsBinaryString(file);
    } else {
      alert("Неподдерживаемый формат файла. Загрузите CSV или Excel.");
    }
  };

  const autoMapFields = (headers: string[]) => {
    const newMapping = { ...mappedFields };
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('url') || lower.includes('ссылка') || lower.includes('link') || lower.includes('tg') || lower.includes('tele')) newMapping.url = h;
      if (lower.includes('name') || lower.includes('имя') || lower.includes('first')) newMapping.firstName = h;
      if (lower.includes('last') || lower.includes('фамилия')) newMapping.lastName = h;
      if (lower.includes('plat') || lower.includes('соц') || lower.includes('платформ')) newMapping.platform = h;
    });
    setMappedFields(newMapping);
  };

  const handleBulkDownloadZip = async () => {
    if (bulkRows.length === 0 || !mappedFields.url) return;
    setIsProcessing(true);
    const zip = new JSZip();
    
    try {
      const size = Math.floor(exportSize);
      const logoRatio = Math.min(logoPixelSize / 300, 0.5);
      const scaledMargin = Math.floor(config.margin * (size / 300));

      const baseOptions = { 
        ...computedConfig,
        width: size,
        height: size,
        margin: scaledMargin,
        imageOptions: {
          ...computedConfig.imageOptions,
          imageSize: logoRatio,
          margin: 0,
          backgroundOptions: {
            color: 'transparent'
          },
          imageBackground: "transparent"
        }
      };

      for (const row of bulkRows) {
        const urlValue = row[mappedFields.url];
        if (!urlValue) continue;

        const url = normalizeUrl(urlValue);
        const tempQr = new QRCodeStyling({
          ...baseOptions,
          data: url,
        });

        const blob = await tempQr.getRawData('svg');
        if (blob) {
          const svgText = await (blob as Blob).text();
          const processedSvg = processSvgString(svgText, size);
          
          const fName = row[mappedFields.firstName] || '';
          const lName = row[mappedFields.lastName] || '';
          const plat = row[mappedFields.platform] || '';
          const filename = `${fName} ${lName} ${plat}`.trim() || `qr_${Math.random().toString(36).substr(2, 5)}`;
          zip.file(`${filename}.svg`, processedSvg);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Bulk_QR_Elit_${new Date().getTime()}.zip`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Ошибка при массовой генерации.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateConfig = (newParams: Partial<QRConfig>) => {
    setConfig((prev) => ({ ...prev, ...newParams }));
  };

  const updateDots = (newParams: any) => {
    setConfig((prev) => ({
      ...prev,
      dotsOptions: { ...prev.dotsOptions, ...newParams },
    }));
  };

  const updateCornersSquare = (newParams: any) => {
    setConfig((prev) => ({
      ...prev,
      cornersSquareOptions: { ...prev.cornersSquareOptions, ...newParams },
    }));
  };

  const updateCornersDot = (newParams: any) => {
    setConfig((prev) => ({
      ...prev,
      cornersDotOptions: { ...prev.cornersDotOptions, ...newParams },
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      updateConfig({ image: objectUrl });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-start gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Layers className="text-white" size={18} />
            </div>
            <h1 className="text-xl tracking-tight">
              <span className="font-black text-black uppercase">QR Code Generator</span>
              <span className="text-emerald-600 font-normal lowercase ml-1">by aelitatata</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="flex-1 space-y-6">
            <div className="flex bg-slate-200/50 p-2.5 rounded-3xl gap-3 mb-6 shadow-sm border border-slate-200/50">
              <button 
                onClick={() => setActiveTab('single')}
                className={`flex-1 py-6 rounded-2xl text-base font-black uppercase tracking-[0.15em] transition-all shadow-sm ${
                  activeTab === 'single' 
                  ? 'bg-emerald-600 text-white shadow-emerald-200 scale-[1.02]' 
                  : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                Один QR
              </button>
              <button 
                onClick={() => setActiveTab('bulk')}
                className={`flex-1 py-6 rounded-2xl text-base font-black uppercase tracking-[0.15em] transition-all shadow-sm ${
                  activeTab === 'bulk' 
                  ? 'bg-emerald-600 text-white shadow-emerald-200 scale-[1.02]' 
                  : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                Массовая генерация
              </button>
            </div>

            {activeTab === 'single' ? (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                  {DATA_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setActiveType(type.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        activeType === type.id 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20 shadow-sm' 
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {type.icon}
                      <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{type.label}</span>
                    </button>
                  ))}
                </div>
                <Accordion title="ВВОД ДАННЫХ" defaultOpen={true}>
                   <div className="space-y-4">
                      <div>
                        <Label>Website URL / Текст</Label>
                        <Input 
                          placeholder="https://yourwebsite.com" 
                          value={config.data}
                          onChange={(e) => updateConfig({ data: e.target.value })}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                        <div>
                          <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Имя (для файла)</Label>
                          <Input 
                            placeholder="Иван" 
                            value={singleFirstName}
                            onChange={(e) => setSingleFirstName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Фамилия (для файла)</Label>
                          <Input 
                            placeholder="Иванов" 
                            value={singleLastName}
                            onChange={(e) => setSingleLastName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Платформа (для файла)</Label>
                          <Input 
                            placeholder="Instagram" 
                            value={singlePlatform}
                            onChange={(e) => setSinglePlatform(e.target.value)}
                          />
                        </div>
                      </div>
                   </div>
                </Accordion>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <FileText className="text-emerald-600" size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Массовый импорт</h3>
                      <p className="text-xs text-slate-500">Поддержка CSV, XLSX, XLS.</p>
                    </div>
                  </div>

                  {bulkRows.length === 0 ? (
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer group bg-slate-50/50">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUploadRaw}
                      />
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-emerald-600 border border-slate-100">
                          <Upload size={24} />
                        </div>
                        <p className="font-black text-slate-800 text-sm uppercase tracking-widest mb-1">Загрузите файл (Excel/CSV)</p>
                        <p className="text-[10px] text-slate-400 font-bold max-w-[250px] mx-auto">Вы сможете выбрать нужные колонки на следующем шаге.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                          <Settings2 size={16} className="text-slate-500" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Настройка полей ({bulkHeaders.length} колонок)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Колонка со ссылкой (URL) *</Label>
                            <select 
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-black appearance-none overflow-y-auto"
                              style={{backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em'}}
                              value={mappedFields.url}
                              onChange={(e) => setMappedFields({...mappedFields, url: e.target.value})}
                            >
                              <option value="">Выберите колонку...</option>
                              {bulkHeaders.map((h, i) => <option key={`${h}-${i}`} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Имя (для имени файла)</Label>
                            <select 
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-black appearance-none overflow-y-auto"
                              style={{backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em'}}
                              value={mappedFields.firstName}
                              onChange={(e) => setMappedFields({...mappedFields, firstName: e.target.value})}
                            >
                              <option value="">Не использовать</option>
                              {bulkHeaders.map((h, i) => <option key={`${h}-${i}`} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Фамилия (для имени файла)</Label>
                            <select 
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-black appearance-none overflow-y-auto"
                              style={{backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em'}}
                              value={mappedFields.lastName}
                              onChange={(e) => setMappedFields({...mappedFields, lastName: e.target.value})}
                            >
                              <option value="">Не использовать</option>
                              {bulkHeaders.map((h, i) => <option key={`${h}-${i}`} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Платформа (для имени файла)</Label>
                            <select 
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-black appearance-none overflow-y-auto"
                              style={{backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em'}}
                              value={mappedFields.platform}
                              onChange={(e) => setMappedFields({...mappedFields, platform: e.target.value})}
                            >
                              <option value="">Не использовать</option>
                              {bulkHeaders.map((h, i) => <option key={`${h}-${i}`} value={h}>{h}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                           <Button variant="ghost" className="text-red-500 text-[10px] uppercase font-black" onClick={() => { setBulkRows([]); setBulkHeaders([]); }}>Удалить файл</Button>
                        </div>
                      </div>

                      {mappedFields.url && bulkRows[0]?.[mappedFields.url] && (
                        <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 animate-in fade-in duration-300">
                          <div className="flex items-center gap-2 mb-4">
                             <CheckCircle2 size={16} className="text-emerald-600" />
                             <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Образец предпросмотра</h4>
                          </div>
                          <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-48 h-48 bg-white rounded-xl shadow-lg border border-emerald-100 flex items-center justify-center overflow-hidden p-2">
                               <div ref={bulkSampleRef} className="scale-[0.6]" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">Первая запись в очереди:</p>
                              <p className="text-sm font-black text-emerald-600">
                                {mappedFields.firstName && bulkRows[0][mappedFields.firstName]} {mappedFields.lastName && bulkRows[0][mappedFields.lastName]}
                              </p>
                              <p className="text-xs font-mono text-slate-400 break-all">{bulkRows[0][mappedFields.url]}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={handleBulkDownloadZip} 
                        disabled={isProcessing || !mappedFields.url}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3"
                      >
                        {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                        {isProcessing ? 'Генерация...' : `Скачать ZIP (${bulkRows.length} шт.)`}
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            )}

            <Accordion title="ЦВЕТА" defaultOpen={false}>
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-500 font-bold mb-3 uppercase tracking-widest text-[10px]">Основной цвет</Label>
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600">
                      <input type="radio" name="colorMode" checked={colorMode === 'single'} onChange={() => setColorMode('single')} className="w-4 h-4 text-emerald-600" /> Один цвет
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600">
                      <input type="radio" name="colorMode" checked={colorMode === 'gradient'} onChange={() => setColorMode('gradient')} className="w-4 h-4 text-emerald-600" /> Градиент
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600">
                      <input type="checkbox" checked={isCustomEyeColor} onChange={(e) => setIsCustomEyeColor(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" /> Свои цвета глаз
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-1 min-w-[140px]">
                      <input type="color" value={config.dotsOptions.color} onChange={(e) => updateDots({ color: e.target.value })} className="w-12 h-10 border-none p-0 cursor-pointer bg-transparent" />
                      <input type="text" value={config.dotsOptions.color.toUpperCase()} onChange={(e) => updateDots({ color: e.target.value })} className="w-full px-3 py-2 text-sm outline-none border-none bg-white font-mono text-black" />
                    </div>
                    {colorMode === 'gradient' && (
                      <>
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-1 min-w-[140px]">
                          <input type="color" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} className="w-12 h-10 border-none p-0 cursor-pointer bg-transparent" />
                          <input type="text" value={gradientColor2.toUpperCase()} onChange={(e) => setGradientColor2(e.target.value)} className="w-full px-3 py-2 text-sm outline-none border-none bg-white font-mono text-black" />
                        </div>
                        <select className="text-sm outline-none bg-white border border-gray-200 rounded-lg h-10 px-2 font-bold cursor-pointer text-black" value={gradientType} onChange={(e) => setGradientType(e.target.value as any)}>
                          <option value="linear">Линейный</option>
                          <option value="radial">Радиальный</option>
                        </select>
                      </>
                    )}
                  </div>
                </div>

                {isCustomEyeColor && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top duration-300">
                    <div>
                      <Label className="text-gray-500 font-bold mb-3 uppercase tracking-widest text-[10px]">Цвет рамки глаз</Label>
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden w-full">
                        <input 
                          type="color" 
                          value={config.cornersSquareOptions.color} 
                          onChange={(e) => updateCornersSquare({ color: e.target.value })} 
                          className="w-12 h-10 border-none p-0 cursor-pointer bg-transparent" 
                        />
                        <input 
                          type="text" 
                          value={config.cornersSquareOptions.color.toUpperCase()} 
                          onChange={(e) => updateCornersSquare({ color: e.target.value })} 
                          className="w-full px-3 py-2 text-sm outline-none border-none bg-white font-mono text-black" 
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-500 font-bold mb-3 uppercase tracking-widest text-[10px]">Цвет зрачка</Label>
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden w-full">
                        <input 
                          type="color" 
                          value={config.cornersDotOptions.color} 
                          onChange={(e) => updateCornersDot({ color: e.target.value })} 
                          className="w-12 h-10 border-none p-0 cursor-pointer bg-transparent" 
                        />
                        <input 
                          type="text" 
                          value={config.cornersDotOptions.color.toUpperCase()} 
                          onChange={(e) => updateCornersDot({ color: e.target.value })} 
                          className="w-full px-3 py-2 text-sm outline-none border-none bg-white font-mono text-black" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-gray-500 font-bold mb-3 uppercase tracking-widest text-[10px]">Цвет фона</Label>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden w-full max-w-[180px]">
                      <input type="color" value={isTransparent ? '#ffffff' : config.backgroundOptions.color} disabled={isTransparent} onChange={(e) => updateConfig({ backgroundOptions: { color: e.target.value } })} className={`w-12 h-10 border-none p-0 cursor-pointer bg-transparent ${isTransparent ? 'opacity-30' : ''}`} />
                      <input type="text" value={isTransparent ? 'ПРОЗРАЧНЫЙ' : config.backgroundOptions.color.toUpperCase()} disabled={isTransparent} onChange={(e) => updateConfig({ backgroundOptions: { color: e.target.value } })} className={`w-full px-3 py-2 text-sm outline-none border-none bg-white font-mono ${isTransparent ? 'text-gray-400' : 'text-black'}`} />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600">
                      <input type="checkbox" checked={isTransparent} onChange={(e) => setIsTransparent(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" /> Прозрачный фон
                    </label>
                  </div>
                </div>
              </div>
            </Accordion>

            <Accordion title="ЛОГОТИП" defaultOpen={false}>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer group">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleLogoUpload} />
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><Plus className="text-emerald-600" size={20} /></div>
                      <p className="font-bold text-slate-800 text-sm">Загрузить лого</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center px-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2"><Label className="mb-0 text-slate-600 uppercase tracking-widest text-[10px]">Размер логотипа</Label><span className="text-xs font-mono text-emerald-600 font-bold">{logoPixelSize}px</span></div>
                    <input type="range" min="20" max="150" step="1" value={logoPixelSize} onChange={(e) => setLogoPixelSize(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                    <p className="text-[9px] text-gray-400 mt-2">Реактивное изменение размера логотипа относительно QR-кода.</p>
                  </div>
                </div>
                {config.image && (
                  <div className="flex items-center justify-between p-3 bg-white border border-emerald-100 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded border border-gray-100 overflow-hidden bg-slate-50 flex items-center justify-center"><img src={config.image} alt="Logo Preview" className="max-w-full max-h-full object-contain" /></div><span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Активен</span></div>
                    <Button variant="ghost" className="text-xs h-8 text-red-600 font-black uppercase" onClick={() => updateConfig({ image: undefined })}>Удалить</Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  {SOCIAL_LOGOS.map((logo) => (
                    <button key={logo.id} onClick={() => updateConfig({ image: logo.url })} className={`w-12 h-12 rounded-lg border flex items-center justify-center bg-white hover:border-emerald-500 transition-all ${config.image === logo.url ? 'border-emerald-500 ring-2 ring-emerald-100 scale-105 shadow-sm' : 'border-gray-200'}`} title={logo.label}>
                      <div className="scale-75">{React.cloneElement(logo.icon as React.ReactElement<any>, { size: 24 })}</div>
                    </button>
                  ))}
                </div>
              </div>
            </Accordion>

            <Accordion title="ДИЗАЙН" defaultOpen={false}>
              <div className="space-y-8">
                <div>
                  <Label className="mb-4 uppercase tracking-widest text-[10px] font-black text-slate-400">Форма узора</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {DOT_STYLES.map((style) => (
                      <button key={style.value} onClick={() => updateDots({ type: style.value })} className={`p-3 rounded-lg border transition-all text-[10px] font-black uppercase tracking-tighter ${config.dotsOptions.type === style.value ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{style.label}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                  <div>
                    <Label className="mb-4 uppercase tracking-widest text-[10px] font-black text-slate-400">Рамка глаза</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {CORNER_SQUARE_STYLES.map((style) => (
                        <button key={style.value} onClick={() => updateCornersSquare({ type: style.value })} className={`p-3 rounded-lg border transition-all text-[10px] font-black uppercase tracking-tighter ${config.cornersSquareOptions.type === style.value ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{style.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-4 uppercase tracking-widest text-[10px] font-black text-slate-400">Зрачок</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {CORNER_DOT_STYLES.map((style) => (
                        <button key={style.value} onClick={() => updateCornersDot({ type: style.value })} className={`p-3 rounded-lg border transition-all text-[10px] font-black uppercase tracking-tighter ${config.cornersDotOptions.type === style.value ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{style.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Accordion>
          </div>

          <div className="w-full lg:w-[400px]">
            <div className="lg:sticky lg:top-24 space-y-6">
              <Card className="p-8">
                <div className="aspect-square w-full flex items-center justify-center bg-white rounded-xl mb-8 relative border border-slate-50 shadow-inner overflow-hidden">
                  {activeTab === 'single' ? (
                    <div ref={qrRef} className="shadow-sm p-4 bg-white rounded-lg transition-transform duration-300" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100 animate-pulse"><Layers className="text-emerald-600" size={32} /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">Конструктор дизайна</span>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">Применяется ко всей массовой партии.</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <span>Размер экспорта</span>
                    <span className="text-emerald-600">{exportSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="300" 
                    max="2000" 
                    step="50"
                    value={exportSize} 
                    onChange={(e) => setExportSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" 
                  />
                  
                  {activeTab === 'single' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <Button variant="primary" className="py-4 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 text-sm font-black uppercase tracking-wider" onClick={() => handleDownload('png')}>Генерировать</Button>
                        <Button className="py-4 bg-sky-400 hover:bg-sky-500 text-white border-none shadow-lg shadow-sky-400/20 text-sm font-black uppercase tracking-wider" onClick={() => handleDownload('png')}>PNG</Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button variant="outline" className="text-sky-500 border-sky-100 bg-sky-50/30 hover:bg-sky-50 text-[10px] font-black tracking-widest py-2" onClick={() => handleDownload('svg')}>.SVG</Button>
                        <Button variant="outline" className="text-sky-500 border-sky-100 bg-sky-50/30 hover:bg-sky-50 text-[10px] font-black tracking-widest py-2" onClick={() => handleDownload('webp')}>.WEBP</Button>
                        <Button variant="outline" className="text-sky-500 border-sky-100 bg-sky-50/30 hover:bg-sky-50 text-[10px] font-black tracking-widest py-2" onClick={() => handleDownload('webp')}>PRINT</Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center"><Layers className="text-white" size={16} /></div>
              <h2 className="text-xl tracking-tight">
                <span className="font-black text-black uppercase">QR Code Generator</span>
                <span className="text-emerald-600 font-normal lowercase ml-1">by aelitatata</span>
              </h2>
            </div>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 leading-relaxed">че?кого?</p>
            <div className="flex justify-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><span>© 2025 ELIT TOOLS</span></div>
        </div>
      </footer>
    </div>
  );
};

export default App;
