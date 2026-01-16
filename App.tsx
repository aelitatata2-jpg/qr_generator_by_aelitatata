import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCodeStyling from 'qr-code-styling';
import Papa from 'papaparse';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { 
  Layers, 
  Plus,
  FileText,
  Upload,
  CheckCircle2,
  Save,
  X,
  Edit2,
  Trash2,
  Share2,
  Download,
  FileJson,
  Info,
  FileCode,
  FileImage,
  AlertTriangle
} from 'lucide-react';
import { 
  Accordion, 
  Button, 
  Input, 
  Label, 
  Card,
  Modal,
  Toast
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
  urlCustom: string;
  firstName: string;
  firstNameCustom: string;
  lastName: string;
  lastNameCustom: string;
  platform: string;
  platformCustom: string;
}

interface QRTemplate {
  id: string;
  name: string;
  config: QRConfig;
  logoPixelSize: number;
  colorMode: 'single' | 'gradient';
  gradientColor2: string;
  gradientType: 'linear' | 'radial';
  isCustomEyeColor: boolean;
  isTransparent: boolean;
  createdAt: number;
}

const EditableNumberLabel: React.FC<{ 
  value: number; 
  onChange: (val: number) => void; 
  min: number; 
  max: number; 
  unit?: string;
}> = ({ value, onChange, min, max, unit = 'px' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    let num = parseInt(tempValue);
    if (isNaN(num)) num = value;
    num = Math.max(min, Math.min(max, num));
    onChange(num);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        className="w-14 h-5 text-[10px] font-mono text-emerald-600 font-bold border border-emerald-300 rounded outline-none px-1"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        onBlur={handleSave}
      />
    );
  }

  return (
    <span 
      className="text-xs font-mono text-emerald-600 font-bold cursor-pointer hover:bg-emerald-100 px-1 rounded transition-colors select-none"
      onDoubleClick={() => {
        setTempValue(value.toString());
        setIsEditing(true);
      }}
      title="Двойной клик для редактирования"
    >
      {value}{unit}
    </span>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [colorMode, setColorMode] = useState<'single' | 'gradient'>('single');
  const [gradientColor2, setGradientColor2] = useState('#0277bd');
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [isCustomEyeColor, setIsCustomEyeColor] = useState(false);
  const [isTransparent, setIsTransparent] = useState(true); 
  const [exportSize, setExportSize] = useState(100); 
  
  const [templates, setTemplates] = useState<QRTemplate[]>(() => {
    const saved = localStorage.getItem('qr_templates');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const [singleFirstName, setSingleFirstName] = useState('');
  const [singleLastName, setSingleLastName] = useState('');
  const [singlePlatform, setSinglePlatform] = useState('');

  // Bulk Generation States
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkHeaders, setBulkHeaders] = useState<string[]>([]);
  const [bulkExportFormat, setBulkExportFormat] = useState<'png' | 'svg'>('png');
  const [mappedFields, setMappedFields] = useState<MappedFields>({
    url: '',
    urlCustom: '',
    firstName: '',
    firstNameCustom: '',
    lastName: '',
    lastNameCustom: '',
    platform: 'Instagram',
    platformCustom: ''
  });
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [logoPixelSize, setLogoPixelSize] = useState(80);
  const [skippedRows, setSkippedRows] = useState<string[]>([]);

  const [config, setConfig] = useState<QRConfig>({
    data: 'https://www.google.com',
    width: 300,
    height: 300,
    margin: 10,
    dotsOptions: { color: '#000000', type: 'square' },
    backgroundOptions: { color: 'transparent' },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.3,
      margin: 0,
      crossOrigin: 'anonymous',
      backgroundOptions: { color: 'transparent' },
      imageBackground: 'transparent'
    },
    cornersSquareOptions: { color: '#000000', type: 'square' },
    cornersDotOptions: { color: '#000000', type: 'square' },
    image: undefined,
  });

  const [qrCode] = useState<QRCodeStyling>(new QRCodeStyling({ ...config, type: 'svg' }));
  const [bulkSampleQr] = useState<QRCodeStyling>(new QRCodeStyling({ ...config, type: 'svg' }));
  
  const qrRef = useRef<HTMLDivElement>(null);
  const bulkSidebarRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const normalizeUrl = (url: string) => {
    if (!url) return "";
    const str = String(url).trim();
    if (str.startsWith('http://') || str.startsWith('https://')) return str;
    return `https://${str}`;
  };

  const computedConfig = useMemo(() => {
    const lSize = Number(logoPixelSize);
    const totalBoxFactor = Math.min(lSize / 300, 0.7);

    const options: any = {
      ...config,
      width: 300,
      height: 300,
      backgroundOptions: {
        ...config.backgroundOptions,
        color: isTransparent ? 'transparent' : (config.backgroundOptions.color || '#ffffff')
      },
      imageOptions: {
        ...config.imageOptions,
        imageSize: totalBoxFactor,
        margin: 0,
        hideBackgroundDots: true,
        backgroundOptions: { color: 'transparent' },
        imageBackground: 'transparent'
      }
    };

    if (colorMode === 'gradient') {
      options.dotsOptions.gradient = {
        type: gradientType,
        rotation: 0,
        colorStops: [{ offset: 0, color: config.dotsOptions.color }, { offset: 1, color: gradientColor2 }],
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

  const processSvgElement = (svg: SVGSVGElement, size: number) => {
    const lSize = Number(logoPixelSize);
    const scale = size / 300;
    
    // Strict dimension enforcement
    svg.setAttribute('width', size.toString());
    svg.setAttribute('height', size.toString());
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.removeAttribute('style'); // Clear potential library-set styles
    
    const imageElement = svg.querySelector('image');
    if (imageElement) {
       // Manual scaling for the logo to ensure it stays proportional in the forced coordinate system
       const scaledLogoSize = lSize * scale;
       const logoX = (size - scaledLogoSize) / 2;
       const logoY = (size - scaledLogoSize) / 2;
       imageElement.setAttribute('x', logoX.toFixed(2));
       imageElement.setAttribute('y', logoY.toFixed(2));
       imageElement.setAttribute('width', scaledLogoSize.toFixed(2));
       imageElement.setAttribute('height', scaledLogoSize.toFixed(2));
       
       const rect = svg.querySelector('rect[data-role="logo-bg"]');
       if (rect) rect.remove();
    }
  };

  const processSvgString = (svgText: string, size: number): string => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svgElement = xmlDoc.querySelector('svg');
    if (!svgElement) return svgText;
    processSvgElement(svgElement as unknown as SVGSVGElement, size);
    return new XMLSerializer().serializeToString(xmlDoc);
  };

  useEffect(() => {
    localStorage.setItem('qr_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    qrCode.update(computedConfig);
    const tid = setTimeout(() => {
      if (qrRef.current) {
        const svg = qrRef.current.querySelector('svg');
        if (svg) processSvgElement(svg, 300);
      }
    }, 100);
    return () => clearTimeout(tid);
  }, [computedConfig, logoPixelSize]);

  useEffect(() => {
    if (activeTab === 'bulk' && bulkRows.length > 0) {
      const urlCol = mappedFields.url;
      const sampleRow = bulkRows[0];
      const sampleUrl = urlCol === '__CUSTOM__' ? mappedFields.urlCustom : sampleRow[urlCol];
      
      if (sampleUrl) {
        bulkSampleQr.update({ ...computedConfig, data: normalizeUrl(sampleUrl) });
        const tid = setTimeout(() => {
          if (bulkSidebarRef.current) {
            const svg = bulkSidebarRef.current.querySelector('svg');
            if (svg) processSvgElement(svg, 300);
          }
        }, 100);
        return () => clearTimeout(tid);
      }
    }
  }, [computedConfig, bulkRows, mappedFields, logoPixelSize, activeTab]);

  useEffect(() => {
    if (activeTab === 'single' && qrRef.current && qrRef.current.innerHTML === '') {
      qrCode.append(qrRef.current);
    }
    if (activeTab === 'bulk' && bulkSidebarRef.current && bulkSidebarRef.current.innerHTML === '' && bulkRows.length > 0) {
      bulkSampleQr.append(bulkSidebarRef.current);
    }
  }, [activeTab, bulkRows]);

  const handleDownload = async (ext: 'png' | 'svg' | 'webp') => {
    const nameParts = [singleFirstName, singleLastName, singlePlatform].map(p => p.trim()).filter(Boolean);
    const filename = nameParts.length > 0 ? nameParts.join('_') : 'QR_Code';
    const size = Math.floor(exportSize);
    
    // Maintain proportional margin regardless of final size
    const scaledMargin = Math.floor(config.margin * (size / 300));

    const downloadQr = new QRCodeStyling({
      ...computedConfig,
      width: size,
      height: size,
      margin: scaledMargin,
      type: 'svg',
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
        img.onload = () => {
          ctx.clearRect(0, 0, size, size);
          // Strict scaling forced by drawImage dimensions
          ctx.drawImage(img, 0, 0, size, size);
          canvas.toBlob((b) => {
            if (b) {
              const url = URL.createObjectURL(b);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${filename}.${ext}`;
              link.click();
            }
          }, `image/${ext === 'webp' ? 'webp' : 'png'}`);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(processedSvg)));
      }
    } catch (e) { alert("Ошибка сохранения."); }
  };

  const getHeadersFromSheet = (ws: XLSX.WorkSheet): string[] => {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const headers: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      const cell = ws[address];
      if (cell && cell.v) {
        headers.push(String(cell.v));
      } else {
        headers.push(`Column ${C + 1}`);
      }
    }
    return headers;
  };

  const parseSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws);
    const headers = getHeadersFromSheet(ws);
    setBulkHeaders(headers);
    setBulkRows(data);
    autoMapFields(headers);
  };

  const handleSheetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedSheet(name);
    if (workbook && name) parseSheetData(workbook, name);
  };

  const handleFileUploadRaw = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkRows([]);
    setBulkHeaders([]);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setSkippedRows([]);
    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          if (results.data.length > 0) {
            const headers = Object.keys(results.data[0]);
            setBulkHeaders(headers);
            setBulkRows(results.data);
            autoMapFields(headers);
          }
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const binaryStr = evt.target?.result;
        const wb = XLSX.read(binaryStr, { type: 'binary' });
        setWorkbook(wb);
        const names = wb.SheetNames;
        setSheetNames(names);
        if (names.length > 0) {
          const firstSheet = names[0];
          setSelectedSheet(firstSheet);
          parseSheetData(wb, firstSheet);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const autoMapFields = (headers: string[]) => {
    const m = { ...mappedFields };
    headers.forEach(h => {
      const l = h.toLowerCase();
      if (l.includes('url') || l.includes('link')) m.url = h;
      if (l.includes('name') || l.includes('имя')) m.firstName = h;
      if (l.includes('last') || l.includes('фамилия')) m.lastName = h;
    });
    setMappedFields(m);
  };

  const handleBulkDownloadZip = async (format: 'png' | 'svg') => {
    const urlField = mappedFields.url;
    if (bulkRows.length === 0 || (!urlField && mappedFields.urlCustom === '')) return;
    setIsProcessing(true);
    setSkippedRows([]);
    const zip = new JSZip();
    const errors: string[] = [];
    let processedCount = 0;

    try {
      const size = Math.floor(exportSize);
      const scaledMargin = Math.floor(config.margin * (size / 300));

      // Aggressive alphanumeric cleaner
      const aggressiveAlphaClean = (val: any): string => {
        if (val === null || val === undefined) return "";
        return String(val).replace(/[^a-zA-Zа-яА-Я0-9]/g, "");
      };

      for (let i = 0; i < bulkRows.length; i++) {
        const row = bulkRows[i];
        
        // Data Retrieval
        const rawUrl = urlField === '__CUSTOM__' ? mappedFields.urlCustom : row[urlField];
        const rawFirstName = mappedFields.firstName === '__CUSTOM__' ? mappedFields.firstNameCustom : row[mappedFields.firstName];
        const rawLastName = mappedFields.lastName === '__CUSTOM__' ? mappedFields.lastNameCustom : row[mappedFields.lastName];

        // Strict Cleaning
        const alphaUrl = aggressiveAlphaClean(rawUrl);
        const alphaFirstName = aggressiveAlphaClean(rawFirstName);
        const alphaLastName = aggressiveAlphaClean(rawLastName);

        // Logic 1: Completely Empty Row (Silent Skip)
        // If neither the URL nor any of the name parts have alphanumeric content, ignore it silently.
        if (alphaUrl.length === 0 && alphaFirstName.length === 0 && alphaLastName.length === 0) {
          continue;
        }

        // Identifying label for logging
        const firstNameStr = String(rawFirstName || "").trim();
        const lastNameStr = String(rawLastName || "").trim();
        const rowIdentifier = `${firstNameStr} ${lastNameStr}`.trim() || `Строка ${i + 1}`;

        // Logic 2: User Error (Missing Link for Named Person)
        // If the URL is empty but the row has at least some name data, it's a genuine error.
        if (alphaUrl.length === 0) {
          console.warn(`Missing link for row ${i}: ${rowIdentifier}`);
          errors.push(`Для ${rowIdentifier} не был сделан QR-код: нет ссылки.`);
          continue;
        }

        // Logic 3: Valid Row
        const rowUrl = rawUrl;
        const tempQr = new QRCodeStyling({ 
          ...computedConfig, 
          width: size, 
          height: size, 
          margin: scaledMargin,
          data: normalizeUrl(rowUrl) 
        });

        const blob = await tempQr.getRawData('svg');
        if (blob) {
          const svgText = await (blob as Blob).text();
          const processedSvg = processSvgString(svgText, size);
          
          const platformStr = mappedFields.platform === '__CUSTOM__' ? mappedFields.platformCustom : mappedFields.platform;
          const fName = [firstNameStr, lastNameStr, platformStr]
            .map(v => String(v).trim()).filter(Boolean).join('_') || `qr_${i + 1}`;
          
          if (format === 'svg') {
            zip.file(`${fName}.svg`, processedSvg);
            processedCount++;
          } else {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const img = new Image();
              const pngPromise = new Promise<void>((resolve) => {
                img.onload = () => {
                  ctx.clearRect(0, 0, size, size);
                  ctx.drawImage(img, 0, 0, size, size);
                  canvas.toBlob((b) => {
                    if (b) {
                      zip.file(`${fName}.png`, b);
                      processedCount++;
                    }
                    resolve();
                  }, 'image/png');
                };
              });
              img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(processedSvg)));
              await pngPromise;
            }
          }
        }
      }

      setSkippedRows(errors);

      if (processedCount > 0) {
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `Bulk_QR_${format.toUpperCase()}.zip`;
        link.click();
        setToastMessage(errors.length > 0 ? `Готово (пропущено ${errors.length})` : 'Архив готов');
      } else {
        alert("Нет данных для генерации QR-кодов. Пожалуйста, проверьте ваш файл.");
      }
    } catch (err) {
      console.error("Bulk Generation Error:", err);
      alert("Ошибка генерации архива.");
    } finally { 
      setIsProcessing(false); 
    }
  };

  const openSaveModal = () => {
    if (templates.length >= 10) return alert('Вы достигли лимита в 10 шаблонов.');
    setTemplateName(`Шаблон ${templates.length + 1}`);
    setIsSaveModalOpen(true);
  };

  const saveTemplate = () => {
    if (!templateName.trim()) return;
    const newTemplate: QRTemplate = {
      id: Date.now().toString(),
      name: templateName,
      config,
      logoPixelSize,
      colorMode,
      gradientColor2,
      gradientType,
      isCustomEyeColor,
      isTransparent,
      createdAt: Date.now()
    };
    setTemplates([...templates, newTemplate]);
    setIsSaveModalOpen(false);
    setToastMessage('Шаблон сохранен');
  };

  const renameTemplate = () => {
    if (!editingTemplateId || !templateName.trim()) return;
    setTemplates(templates.map(t => t.id === editingTemplateId ? { ...t, name: templateName } : t));
    setIsRenameModalOpen(false);
    setEditingTemplateId(null);
    setToastMessage('Шаблон переименован');
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    setToastMessage('Шаблон удален');
  };

  const shareTemplate = (t: QRTemplate) => {
    const configStr = JSON.stringify(t);
    navigator.clipboard.writeText(configStr);
    setToastMessage('Ссылка скопирована');
  };

  const exportTemplateFile = (t: QRTemplate) => {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${t.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToastMessage('Файл экспортирован');
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const imported = JSON.parse(content) as QRTemplate;
        if (!imported.name || !imported.config || typeof imported.logoPixelSize !== 'number') {
          throw new Error('Invalid structure');
        }
        const newTemplate: QRTemplate = {
          ...imported,
          id: Date.now().toString(),
          createdAt: Date.now()
        };
        setTemplates(prev => {
          if (prev.length >= 10) {
            alert('Лимит шаблонов (10) превышен. Удалите лишние.');
            return prev;
          }
          return [...prev, newTemplate];
        });
        applyTemplate(newTemplate);
        setToastMessage('Шаблон импортирован');
      } catch (err) {
        alert('Ошибка: Неверный формат файла');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const applyTemplate = (t: QRTemplate) => {
    setConfig({ ...t.config, data: config.data });
    setLogoPixelSize(t.logoPixelSize);
    setColorMode(t.colorMode);
    setGradientColor2(t.gradientColor2);
    setGradientType(t.gradientType);
    setIsCustomEyeColor(t.isCustomEyeColor);
    setIsTransparent(t.isTransparent);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setConfig(prev => ({ ...prev, image: URL.createObjectURL(file) }));
  };

  const resetBulk = () => {
    setBulkRows([]);
    setBulkHeaders([]);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setSkippedRows([]);
  };

  const MappingField = ({ label, field, mappedFields, setMappedFields, bulkHeaders, required }: any) => {
    const customFieldName = `${field}Custom` as keyof MappedFields;
    const isCustom = mappedFields[field] === '__CUSTOM__';
    const showError = required && !mappedFields[field];

    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label className="text-[10px] uppercase mb-0">{label}</Label>
          {showError && <span className="text-[10px] font-light text-red-500">Обязательно заполните это поле</span>}
        </div>
        <div className="flex flex-col gap-2">
          <select 
            className={`w-full h-10 px-3 bg-white border rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-colors ${showError ? 'border-red-300' : 'border-slate-200'}`} 
            value={mappedFields[field]} 
            onChange={(e) => setMappedFields({ ...mappedFields, [field]: e.target.value })}
          >
            <option value="">Не выбрано</option>
            <option value="__CUSTOM__">Ввести своё значение</option>
            {bulkHeaders.map((h: string) => <option key={h} value={h}>{h}</option>)}
          </select>
          {isCustom && (
            <Input 
              placeholder="Введите текст..." 
              value={mappedFields[customFieldName] || ''} 
              onChange={(e) => setMappedFields({ ...mappedFields, [customFieldName]: e.target.value })} 
              className="h-10 text-xs"
            />
          )}
        </div>
      </div>
    );
  };

  const getExampleFilename = () => {
    if (bulkRows.length === 0) return `example.${bulkExportFormat}`;
    const firstRow = bulkRows[0];
    const getVal = (field: 'firstName' | 'lastName' | 'platform') => {
      const mapping = mappedFields[field];
      if (field === 'platform') return mapping;
      return mapping === '__CUSTOM__' ? mappedFields[`${field}Custom`] : (firstRow[mapping] || '');
    };
    const name = [getVal('firstName'), getVal('lastName'), getVal('platform')]
      .map(v => String(v).trim()).filter(Boolean).join('_') || 'qr';
    return `${name}.${bulkExportFormat}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-start gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center"><Layers className="text-white" size={18} /></div>
            <h1 className="text-xl tracking-tight uppercase font-black">QR Code Generator <span className="text-emerald-600 font-normal lowercase ml-1">by aelitatata</span></h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6">
            <div className="flex bg-slate-200/50 p-2 rounded-3xl gap-2 shadow-sm border border-slate-200">
              <button onClick={() => setActiveTab('single')} className={`flex-1 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'single' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Один QR</button>
              <button onClick={() => setActiveTab('bulk')} className={`flex-1 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'bulk' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Массовая генерация</button>
            </div>

            {activeTab === 'single' ? (
              <Accordion title="ВВОД ДАННЫХ" defaultOpen={true}>
                 <div className="space-y-4">
                    <Input placeholder="https://..." value={config.data} onChange={(e) => setConfig({ ...config, data: e.target.value })} />
                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                      <Input placeholder="Имя" value={singleFirstName} onChange={(e) => setSingleFirstName(e.target.value)} />
                      <Input placeholder="Фамилия" value={singleLastName} onChange={(e) => setSingleLastName(e.target.value)} />
                      <Input placeholder="Платформа" value={singlePlatform} onChange={(e) => setSinglePlatform(e.target.value)} />
                    </div>
                 </div>
              </Accordion>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-4"><FileText className="text-emerald-600" size={18} /><h3 className="font-black text-sm uppercase">Массовый импорт</h3></div>
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
                    <Info className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-emerald-800 text-xs font-bold uppercase tracking-tight leading-relaxed">
                      Внимание. Текущие настройки дизайна будут применены ко всему списку.
                    </p>
                  </div>
                  {bulkRows.length === 0 ? (
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:bg-emerald-50 cursor-pointer bg-slate-50/50">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUploadRaw} />
                      <Upload size={24} className="mx-auto text-emerald-600 mb-2" />
                      <p className="font-black text-[10px] uppercase">Загрузите CSV/Excel</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {sheetNames.length > 1 && (
                        <div className="border-b pb-4 mb-2">
                          <Label className="text-[10px] uppercase">Выберите лист</Label>
                          <select className="w-full h-10 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" value={selectedSheet} onChange={handleSheetSelect}>
                            {sheetNames.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <MappingField label="Имя" field="firstName" mappedFields={mappedFields} setMappedFields={setMappedFields} bulkHeaders={bulkHeaders} />
                          <MappingField label="Фамилия" field="lastName" mappedFields={mappedFields} setMappedFields={setMappedFields} bulkHeaders={bulkHeaders} />
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase">Платформа</Label>
                            <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none" value={mappedFields.platform} onChange={(e) => setMappedFields({ ...mappedFields, platform: e.target.value })}>
                              <option value="Instagram">Instagram</option>
                              <option value="Telegram">Telegram</option>
                            </select>
                          </div>
                          <MappingField label="Ссылка *" field="url" mappedFields={mappedFields} setMappedFields={setMappedFields} bulkHeaders={bulkHeaders} required={true} />
                        </div>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-4">
                        <div>
                          <Label className="text-[10px] uppercase text-slate-400">Формат скачивания:</Label>
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => setBulkExportFormat('png')} className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 font-black uppercase text-[10px] transition-all ${bulkExportFormat === 'png' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><FileImage size={14} /> PNG</button>
                            <button onClick={() => setBulkExportFormat('svg')} className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 font-black uppercase text-[10px] transition-all ${bulkExportFormat === 'svg' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><FileCode size={14} /> SVG</button>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                          <Label className="text-[10px] uppercase text-slate-400">Пример названия файла:</Label>
                          <div className="mt-2 bg-slate-50 px-3 py-2 rounded-lg font-mono text-[11px] text-emerald-600 font-bold overflow-hidden text-ellipsis whitespace-nowrap">{getExampleFilename()}</div>
                        </div>
                      </div>
                      <Button onClick={resetBulk} variant="ghost" className="text-red-500 text-[10px] uppercase font-black w-full justify-center">Удалить текущий файл</Button>
                    </div>
                  )}
                </Card>

                {skippedRows.length > 0 && (
                  <Card className="p-6 border-red-100 bg-red-50/30">
                    <div className="flex items-center gap-2 mb-4 text-red-600">
                      <AlertTriangle size={18} />
                      <h3 className="font-black text-sm uppercase">Отчет о генерации: Пропущено {skippedRows.length} строк</h3>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {skippedRows.map((err, idx) => (
                        <p key={idx} className="text-[11px] font-bold text-red-500 leading-tight border-l-2 border-red-200 pl-2">
                          {err}
                        </p>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            <Accordion title="ЦВЕТА" defaultOpen={false}>
              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setColorMode('single')} className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs uppercase ${colorMode === 'single' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Один цвет</button>
                    <button onClick={() => setColorMode('gradient')} className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs uppercase ${colorMode === 'gradient' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Градиент</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] uppercase">Цвет переднего плана</Label>
                      <div className="flex items-center gap-2 border p-2 rounded-lg">
                        <input type="color" value={config.dotsOptions.color} onChange={(e) => setConfig({ ...config, dotsOptions: { ...config.dotsOptions, color: e.target.value } })} className="w-8 h-8 cursor-pointer" />
                        <span className="text-xs font-mono uppercase">{config.dotsOptions.color}</span>
                      </div>
                    </div>
                    {colorMode === 'gradient' && (
                      <div>
                        <Label className="text-[10px] uppercase">Второй цвет</Label>
                        <div className="flex items-center gap-2 border p-2 rounded-lg">
                          <input type="color" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} className="w-8 h-8 cursor-pointer" />
                          <span className="text-xs font-mono uppercase">{gradientColor2}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-4">
                    <Label className="text-[10px] uppercase">Фон</Label>
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-2 border p-2 rounded-lg flex-1 ${isTransparent ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input type="color" value={config.backgroundOptions.color === 'transparent' ? '#ffffff' : config.backgroundOptions.color} onChange={(e) => setConfig({ ...config, backgroundOptions: { color: e.target.value } })} className="w-8 h-8 cursor-pointer" />
                        <span className="text-xs font-mono uppercase">{config.backgroundOptions.color === 'transparent' ? '#FFFFFF' : config.backgroundOptions.color}</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <input type="checkbox" checked={isTransparent} onChange={(e) => setIsTransparent(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                        <span className="text-xs font-bold uppercase">Прозрачный</span>
                      </label>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isCustomEyeColor} onChange={(e) => setIsCustomEyeColor(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                      <span className="text-xs font-bold uppercase">Свои цвета для глаз</span>
                    </label>
                    {isCustomEyeColor && (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <Label className="text-[10px] uppercase">Рамка глаза</Label>
                          <input type="color" value={config.cornersSquareOptions.color} onChange={(e) => setConfig({...config, cornersSquareOptions: { ...config.cornersSquareOptions, color: e.target.value }})} className="w-full h-8" />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase">Зрачок</Label>
                          <input type="color" value={config.cornersDotOptions.color} onChange={(e) => setConfig({...config, cornersDotOptions: { ...config.cornersDotOptions, color: e.target.value }})} className="w-full h-8" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Accordion>

            <Accordion title="ДИЗАЙН" defaultOpen={false}>
              <div className="space-y-4">
                <Label className="text-[10px] uppercase">Стиль точек</Label>
                <div className="grid grid-cols-3 gap-2">
                  {DOT_STYLES.map(s => <button key={s.value} onClick={() => setConfig({ ...config, dotsOptions: { ...config.dotsOptions, type: s.value } })} className={`p-2 rounded-lg border text-[10px] font-black uppercase ${config.dotsOptions.type === s.value ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600'}`}>{s.label}</button>)}
                </div>
              </div>
            </Accordion>

            <Accordion title="УГЛЫ" defaultOpen={false}>
              <div className="space-y-6">
                <div>
                  <Label className="text-[10px] uppercase">Рамка (Eye Frame)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {CORNER_SQUARE_STYLES.map(s => (
                      <button key={s.value} onClick={() => setConfig({ ...config, cornersSquareOptions: { ...config.cornersSquareOptions, type: s.value } })} className={`p-2 rounded-lg border text-[10px] font-black uppercase ${config.cornersSquareOptions.type === s.value ? 'bg-emerald-600 text-white' : 'bg-white'}`}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase">Зрачок (Eye Dot)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CORNER_DOT_STYLES.map(s => (
                      <button key={s.value} onClick={() => setConfig({ ...config, cornersDotOptions: { ...config.cornersDotOptions, type: s.value } })} className={`p-2 rounded-lg border text-[10px] font-black uppercase ${config.cornersDotOptions.type === s.value ? 'bg-emerald-600 text-white' : 'bg-white'}`}>{s.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </Accordion>

            <Accordion title="ЛОГОТИП" defaultOpen={false}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-emerald-50 cursor-pointer">
                    <input type="file" className="absolute inset-0 opacity-0" onChange={handleLogoUpload} />
                    <Plus className="mx-auto text-emerald-600 mb-2" />
                    <p className="font-bold text-sm">Загрузить лого</p>
                  </div>
                  <div className="space-y-4">
                    <div className="px-4 bg-slate-50 rounded-xl py-3 border border-slate-100">
                      <div className="flex justify-between mb-1"><Label className="mb-0 text-[10px] uppercase">Размер логотипа</Label><EditableNumberLabel value={logoPixelSize} onChange={setLogoPixelSize} min={20} max={150} /></div>
                      <input type="range" min="20" max="150" value={logoPixelSize} onChange={(e) => setLogoPixelSize(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg accent-emerald-600" />
                    </div>
                  </div>
                </div>
                {config.image && <Button variant="ghost" className="text-red-600 uppercase text-xs" onClick={() => setConfig({ ...config, image: undefined })}>Удалить текущий лого</Button>}
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_LOGOS.map(l => <button key={l.id} onClick={() => setConfig({ ...config, image: l.url })} className={`w-10 h-10 border rounded-lg flex items-center justify-center bg-white ${config.image === l.url ? 'ring-2 ring-emerald-500' : 'border-gray-200'}`}>{React.cloneElement(l.icon as any, { size: 18 })}</button>)}
                </div>
              </div>
            </Accordion>
          </div>

          <div className="w-full lg:w-[400px] lg:sticky lg:top-24">
            <Card className="p-8 shadow-xl border-slate-200">
              <div className="aspect-square w-full bg-white rounded-xl mb-8 border border-slate-100 shadow-inner relative overflow-hidden flex items-center justify-center">
                {activeTab === 'single' ? (
                  <div ref={qrRef} className="h-full w-full flex items-center justify-center" />
                ) : bulkRows.length > 0 ? (
                  <div ref={bulkSidebarRef} className="h-full w-full flex items-center justify-center" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-300 italic text-sm font-bold uppercase tracking-widest text-center px-4">Загрузите данные для предпросмотра</div>
                )}
              </div>
              
              <div className="space-y-4">
                <Label className="text-[10px] uppercase text-slate-400 font-black">Размер экспорта</Label>
                <input type="range" min="50" max="1000" step="10" value={exportSize} onChange={(e) => setExportSize(parseInt(e.target.value))} className="w-full h-2 bg-emerald-100 rounded-lg accent-emerald-600 cursor-pointer" />
                <div className="text-center">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full border border-emerald-100 shadow-sm">{exportSize} x {exportSize} px</span>
                </div>

                {activeTab === 'single' ? (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button className="w-full bg-emerald-600 text-white font-black" onClick={() => handleDownload('png')}>PNG</Button>
                    <Button variant="outline" className="w-full border-emerald-600 text-emerald-600 font-black" onClick={() => handleDownload('svg')}>SVG</Button>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    <Button 
                      disabled={bulkRows.length === 0 || isProcessing || !mappedFields.url}
                      className="w-full bg-emerald-600 text-white font-black py-4 flex flex-col gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => handleBulkDownloadZip(bulkExportFormat)}
                    >
                      <span className="flex items-center gap-2"><Download size={18} /> {isProcessing ? 'Обработка...' : `СКАЧАТЬ ZIP (${bulkExportFormat.toUpperCase()})`}</span>
                      {bulkRows.length > 0 && <span className="text-[9px] opacity-70">Всего объектов: {bulkRows.length}</span>}
                    </Button>
                  </div>
                )}
                
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t">
                  <Button variant="ghost" className="w-full text-emerald-700 text-xs font-black uppercase border hover:bg-emerald-50" onClick={openSaveModal}><Save size={14} className="mr-1" /> Сохранить шаблон</Button>
                  <Button variant="ghost" className="w-full text-slate-700 text-xs font-black uppercase border hover:bg-slate-50" onClick={handleImportClick}><FileJson size={14} className="mr-1" /> Загрузить из файла</Button>
                  <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImportFile} />
                </div>
              </div>
            </Card>

            {templates.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400">Мои шаблоны ({templates.length}/10)</h3>
                <div className="grid grid-cols-1 gap-3">
                  {templates.map(t => (
                    <div key={t.id} className="group relative bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between" onClick={() => applyTemplate(t)}>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-tight text-slate-800">{t.name}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setEditingTemplateId(t.id); setTemplateName(t.name); setIsRenameModalOpen(true); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-600" title="Переименовать"><Edit2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); exportTemplateFile(t); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-600" title="Скачать JSON"><Download size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); shareTemplate(t); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-600" title="Копировать настройки"><Share2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }} className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600" title="Удалить"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t py-16 text-center">
        <h2 className="font-black uppercase tracking-tight">QR Code Generator by aelitatata</h2>
        <p className="text-slate-400 text-[10px] mt-4 uppercase tracking-widest">© 2025 ELIT TOOLS</p>
      </footer>

      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Сохранить шаблон" footer={<><Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>Отмена</Button><Button onClick={saveTemplate}>Сохранить</Button></>}>
        <div className="space-y-4">
          <Label className="text-[10px] uppercase">Название шаблона</Label>
          <Input autoFocus value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Напр. Шаблон для Instagram" onKeyDown={(e) => e.key === 'Enter' && saveTemplate()} />
        </div>
      </Modal>

      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Переименовать шаблон" footer={<><Button variant="ghost" onClick={() => setIsRenameModalOpen(false)}>Отмена</Button><Button onClick={renameTemplate}>Сохранить</Button></>}>
        <div className="space-y-4">
          <Label className="text-[10px] uppercase">Новое название</Label>
          <Input autoFocus value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Введите название..." onKeyDown={(e) => e.key === 'Enter' && renameTemplate()} />
        </div>
      </Modal>

      <Toast message={toastMessage} visible={!!toastMessage} onHide={() => setToastMessage('')} />
    </div>
  );
};

export default App;