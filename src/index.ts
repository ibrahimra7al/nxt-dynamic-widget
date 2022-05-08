import * as path from 'path';
import * as fs from 'fs';

const resolveWidgetTemplateFile = function (widgetDirectory: string): string {
    return path.join(widgetDirectory, 'default');
}

const generateDynamicWidgetContent = function(context: string): string {
    let rootDirectory = path.resolve(context, './src/widgets');
    let dynamicWidgetComponent = `
    // @ts-nocheck

    import loadable from '@react-loadable/revised';
    const Widgets = {};
    `
    dynamicWidgetComponent += fs.readdirSync(rootDirectory).map(p => ({
        path: path.join(rootDirectory, p),
        name: p
    })).filter(p => fs.lstatSync(p.path).isDirectory()).map(d => {
        d.path = resolveWidgetTemplateFile(d.path);
        return d;
    }).map(({path, name}) => `
        Widgets['${name}'] = Loadable({
            loader: () => import(/* webpackChunkName: '${name}' */ '${path}'),
            loading: () => <div>Loading...</div>
        });
    `).join('');
    dynamicWidgetComponent += `const WebpackNXTDynamicWidget = ({name}) => { const Widget = Widgets[name]; return <Widget />; };`
    dynamicWidgetComponent += 'export default WebpackNXTDynamicWidget';
    return dynamicWidgetComponent;
}

const loader = function (content:string) :string {
    const {
        rootDirectory
    } = this.getOptions({
        "type": "object",
        "properties": {
          "rootDirectory": {
            "type": "string"
          }
        },
        "additionalProperties": false
      });
    if(content.includes("WebpackNXTDynamicWidget")) return generateDynamicWidgetContent(rootDirectory);
    return content;
}

export default loader;
module.exports = loader;