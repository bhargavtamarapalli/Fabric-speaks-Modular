declare module 'multer' {
  import { RequestHandler } from 'express';
  
  namespace multer {
    interface File {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
      fieldname: string;
    }

    interface Options {
      dest?: string;
      storage?: any;
      limits?: any;
    }

    interface Instance {
      single(fieldname: string): RequestHandler;
      array(fieldname: string, maxCount?: number): RequestHandler;
      fields(fields: { name: string, maxCount?: number }[]): RequestHandler;
      none(): RequestHandler;
      any(): RequestHandler;
    }
  }

  function multer(options?: multer.Options): multer.Instance;
  
  namespace multer {
    function memoryStorage(): any;
  }
  
  export = multer;
}
