import * as vscode from "vscode";

import { analyze, complete, definition, hover, isHostFile } from "@/document";

export function activate(context: vscode.ExtensionContext): void {
    const selector: vscode.DocumentSelector = [
        { language: "yaml", pattern: "**/aiox.yaml" },
        { language: "yaml", pattern: "**/aiox.*.yaml" },
    ];
    const diagnostics = vscode.languages.createDiagnosticCollection("aiox");
    const supports = (document: vscode.TextDocument) =>
        document.languageId === "yaml" && isHostFile(document.uri.path);
    const update = (document: vscode.TextDocument) => {
        if (!supports(document)) return;
        diagnostics.set(
            document.uri,
            analyze(document.getText()).issues.map((issue) => {
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(
                        document.positionAt(issue.start),
                        document.positionAt(issue.end),
                    ),
                    issue.message,
                    vscode.DiagnosticSeverity.Error,
                );
                diagnostic.source = "AIOX";
                return diagnostic;
            }),
        );
    };
    context.subscriptions.push(
        diagnostics,
        vscode.workspace.onDidOpenTextDocument(update),
        vscode.workspace.onDidChangeTextDocument((event) =>
            update(event.document),
        ),
        vscode.workspace.onDidCloseTextDocument((document) =>
            diagnostics.delete(document.uri),
        ),
        vscode.languages.registerCompletionItemProvider(
            selector,
            {
                provideCompletionItems(document, position) {
                    return complete(
                        document.getText(),
                        document.offsetAt(position),
                    ).map((agent) => {
                        const item = new vscode.CompletionItem(
                            agent.name,
                            vscode.CompletionItemKind.Reference,
                        );
                        // Replace the YAML scalar as a whole, including its quotes and spaces.
                        item.insertText = agent.insertText;
                        if (agent.replace) {
                            item.range = new vscode.Range(
                                document.positionAt(agent.replace.start),
                                document.positionAt(agent.replace.end),
                            );
                            item.filterText = /^["']/.test(
                                document.getText(item.range),
                            )
                                ? agent.insertText
                                : agent.name;
                        }
                        item.detail = "AIOX Agent";
                        return item;
                    });
                },
            },
            "[",
            ",",
            " ",
        ),
        vscode.languages.registerDefinitionProvider(selector, {
            provideDefinition(document, position) {
                const target = definition(
                    document.getText(),
                    document.offsetAt(position),
                );
                if (target)
                    return new vscode.Location(
                        document.uri,
                        new vscode.Range(
                            document.positionAt(target.start),
                            document.positionAt(target.end),
                        ),
                    );
            },
        }),
        vscode.languages.registerHoverProvider(selector, {
            provideHover(document, position) {
                const message = hover(
                    document.getText(),
                    document.offsetAt(position),
                );
                if (message)
                    return new vscode.Hover(new vscode.MarkdownString(message));
            },
        }),
    );
    for (const document of vscode.workspace.textDocuments) update(document);
}
