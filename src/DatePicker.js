// Use dayjs instead of moment.js
// Code from https://ant.design/docs/react/replace-moment
import dayjsGenerateConfig from 'rc-picker/lib/generate/dayjs';
import generatePicker from 'antd/es/date-picker/generatePicker';
import 'antd/es/date-picker/style/index';

export const DatePicker = generatePicker(dayjsGenerateConfig);
