import type { UEditorInstance, UEditorConfig } from '@/types';

/**
 * UEditor 加载器
 * 动态加载 UEditor 静态资源
 */

let ueditorLoaded = false;
let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    UE: any;
    ueditorVersion: string;
  }
}

/**
 * 获取 UEditor 资源路径
 */
function getUEditorPath(): string {
  // 优先使用 CDN
  const cdnUrl = import.meta.env.VITE_UE_CDN_URL;
  if (cdnUrl) {
    return cdnUrl;
  }
  // 使用本地 public 目录
  return '/ueditor';
}

/**
 * 加载 UEditor 脚本
 */
function loadUEditorScript(): Promise<void> {
  if (ueditorLoaded) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const path = getUEditorPath();
    
    // 先设置全局路径变量，UEditor 需要它
    (window as any).UEDITOR_HOME_URL = path + '/';
    
    // 1. 先加载 ueditor.config.js
    const configScript = document.createElement('script');
    configScript.src = `${path}/ueditor.config.js`;
    configScript.onload = () => {
      // 2. 再加载 ueditor.all.min.js
      const script = document.createElement('script');
      script.src = `${path}/ueditor.all.min.js`;
      script.onload = () => {
        ueditorLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('加载 ueditor.all.min.js 失败'));
      };
      document.head.appendChild(script);
    };
    configScript.onerror = () => {
      // config 加载失败也尝试直接加载核心 JS
      const script = document.createElement('script');
      script.src = `${path}/ueditor.all.min.js`;
      script.onload = () => {
        ueditorLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('加载 UEditor 失败'));
      };
      document.head.appendChild(script);
    };
    document.head.appendChild(configScript);
  });

  return loadPromise;
}

/**
 * 初始化 UEditor 实例
 */
export async function initUEditor(
  containerId: string,
  config?: Partial<UEditorConfig>
): Promise<UEditorInstance> {
  await loadUEditorScript();

  const defaultConfig: any = {
    serverUrl: '/api/ueditor',
    UEDITOR_HOME_URL: getUEditorPath() + '/',
    initialFrameWidth: '100%',
    initialFrameHeight: 600,
    initialContent: config?.initialContent || '',
    focus: true,
    // 保留完整原生工具栏，通过 CSS 魔改 UI，现应要求呈现满配大满贯工具排列
    toolbars: [
      [
        'source', 'undo', 'redo', '|',
        'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'removeformat', 'formatmatch', 'autotypeset', 'blockquote', 'pasteplain', '|',
        'forecolor', 'backcolor', 'insertorderedlist', 'insertunorderedlist', 'selectall', 'cleardoc', '|',
        'paragraph', 'fontfamily', 'fontsize', '|',
        'justifyleft', 'justifycenter', 'justifyright', 'justifyjustify', '|',
        'rowspacingtop', 'rowspacingbottom', 'lineheight', 'indent', '|',
        'link', 'unlink', '|',
        'insertimage', 'emotion', 'insertvideo', 'attachment', 'insertcode', '|',
        'horizontal', 'inserttable', 'date', 'time', 'spechars', 'searchreplace', 'preview'
      ]
    ],
    // 隐藏底部元素路径和字数
    elementPathEnabled: false,
    wordCount: false,
    enableAutoSave: false,
    autoHeightEnabled: true,
    ...config,
  };

  const ue = window.UE.getEditor(containerId, defaultConfig);

  return new Promise((resolve) => {
    ue.ready(() => {
      resolve({
        ready: (callback: () => void) => ue.ready(callback),
        getContent: () => ue.getContent(),
        getContentTxt: () => ue.getContentTxt(),
        setContent: (content: string, isAppend?: boolean) => ue.setContent(content, isAppend),
        getPlainTxt: () => ue.getPlainTxt(),
        hasContents: () => ue.hasContents(),
        focus: () => ue.focus(),
        blur: () => ue.blur(),
        isFocus: () => ue.isFocus(),
        execCommand: (cmd: string, ...args: any[]) => ue.execCommand(cmd, ...args),
        fireEvent: (eventName: string, ...args: any[]) => ue.fireEvent(eventName, ...args),
        addListener: (event: string, callback: (...args: any[]) => void) => ue.addListener(event, callback),
        destroy: () => ue.destroy(),
        selection: ue.selection,
        document: ue.document,
        window: ue.window,
        iframe: ue.iframe,
      });
    });
  });
}

/**
 * 销毁 UEditor 实例
 */
export function destroyUEditor(id: string): void {
  if (window.UE && window.UE.getEditor) {
    const ue = window.UE.getEditor(id);
    if (ue) {
      ue.destroy();
    }
  }
}

/**
 * 获取 UEditor 版本
 */
export function getUEditorVersion(): string {
  return window.ueditorVersion || '1.6.0';
}
