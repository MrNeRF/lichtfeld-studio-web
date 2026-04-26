import tkinter as tk
from tkinter import filedialog, messagebox
import tomllib
import json

class PluginConfigGenerator:
    def __init__(self, root):
        self.root = root
        self.root.title("Lichtfeld Plugin Manager V1.0")
        self.root.geometry("1150x600")
        
        # Main layout
        self.main_paned = tk.PanedWindow(root, orient="horizontal", sashpad=4, sashrelief="groove")
        self.main_paned.pack(fill="both", expand=True)

        self.input_frame = tk.Frame(self.main_paned, padx=10, pady=10)
        self.preview_frame = tk.Frame(self.main_paned, padx=20, pady=20, bg="#f8f9fa")
        self.main_paned.add(self.input_frame, width=550)
        self.main_paned.add(self.preview_frame)

        self.entries = {}
        self._build_input_gui()
        self._build_preview_gui()

    def _build_input_gui(self):
        fields = [
            ("namespace", "Namespace"), 
            ("name", "Name (Internal)"), 
            ("displayName", "Display Name"),
            ("author", "Author"), 
            ("latestVersion", "Version"), 
            ("lichtfeldVersion", "Lichtfeld Version"), 
            ("pluginApi", "Plugin API"), 
            ("repository", "Repository URL"), 
            ("keywords", "Keywords (comma sep)")
        ]

        for i, (key, label) in enumerate(fields):
            tk.Label(self.input_frame, text=label).grid(row=i, column=0, sticky="w")
            
            entry_frame = tk.Frame(self.input_frame)
            entry_frame.grid(row=i, column=1, pady=2, padx=5, sticky="ew")
            
            entry = tk.Entry(entry_frame, width=40)
            entry.pack(side="left", fill="x", expand=True)
            
            if key == "namespace": entry.insert(0, "community")
            if key == "displayName":
                tk.Button(entry_frame, text="✨", command=self.auto_format_display, 
                          width=2, height=1, font=("Arial", 8)).pack(side="right", padx=(2,0))
            
            entry.bind("<KeyRelease>", lambda e: self.update_preview())
            self.entries[key] = entry

        # Multi-line inputs
        tk.Label(self.input_frame, text="Summary").grid(row=10, column=0, sticky="nw")
        self.summary_txt = tk.Text(self.input_frame, height=6, width=40, wrap="word")
        self.summary_txt.grid(row=10, column=1, pady=5, padx=5)
        self.summary_txt.bind("<KeyRelease>", lambda e: self.update_preview())

        tk.Label(self.input_frame, text="Description").grid(row=11, column=0, sticky="nw")
        self.desc_txt = tk.Text(self.input_frame, height=6, width=40, wrap="word")
        self.desc_txt.grid(row=11, column=1, pady=5, padx=5)
        self.desc_txt.bind("<KeyRelease>", lambda e: self.update_preview())

        tk.Label(self.input_frame, text="Dependencies\n(one per line)").grid(row=12, column=0, sticky="nw")
        self.dep_txt = tk.Text(self.input_frame, height=4, width=40)
        self.dep_txt.grid(row=12, column=1, pady=5, padx=5)

        btn_box = tk.Frame(self.input_frame)
        btn_box.grid(row=13, column=0, columnspan=2, pady=10)
        tk.Button(btn_box, text="1. Load TOML", command=self.load_toml, width=15).pack(side="left", padx=5)
        tk.Button(btn_box, text="2. Save JSON", command=self.save_json, bg="#4CAF50", fg="white", width=15).pack(side="left", padx=5)

    def auto_format_display(self):
        current = self.entries["displayName"].get()
        formatted = current.replace("_", " ").title()
        self.entries["displayName"].delete(0, tk.END)
        self.entries["displayName"].insert(0, formatted)
        self.update_preview()

    def _build_preview_gui(self):
        tk.Label(self.preview_frame, text="WEB CARD PREVIEW", font=("Arial", 10, "bold"), bg="#f8f9fa").pack(pady=5)
        self.card = tk.Frame(self.preview_frame, bg="white", padx=25, pady=25, highlightbackground="#e0e0e0", highlightthickness=1)
        self.card.pack(fill="x", pady=10)

        header = tk.Frame(self.card, bg="white")
        header.pack(fill="x")
        self.pre_ns = tk.Label(header, text="COMMUNITY", fg="#0052cc", bg="#eef4ff", font=("Arial", 8, "bold"), padx=8)
        self.pre_ns.pack(side="left")
        self.pre_ver = tk.Label(header, text="V0.0.0", fg="#666", bg="white", font=("Arial", 9))
        self.pre_ver.pack(side="right")

        self.pre_name = tk.Label(self.card, text="PluginName", font=("Arial", 18, "bold"), bg="white")
        self.pre_name.pack(anchor="w", pady=(10, 5))

        self.pre_sum = tk.Label(self.card, text="", font=("Arial", 11), bg="white", fg="#444", justify="left", wraplength=500)
        self.pre_sum.pack(anchor="w", pady=2)

        self.kw_frame = tk.Frame(self.card, bg="white")
        self.kw_frame.pack(anchor="w", pady=5)

        self.pre_footer = tk.Label(self.card, text="", font=("Arial", 9), bg="white", fg="#888")
        self.pre_footer.pack(anchor="w", pady=(15, 0))
        self.pre_id = tk.Label(self.card, text="", font=("Courier", 8), bg="white", fg="#aaa")
        self.pre_id.pack(anchor="w")

    def update_preview(self):
        name = self.entries["name"].get() or "PluginName"
        dname = self.entries["displayName"].get() or name
        ns = self.entries["namespace"].get() or "community"
        self.pre_ns.config(text=ns.upper())
        self.pre_name.config(text=dname)
        self.pre_ver.config(text=f"V{self.entries['latestVersion'].get()}")
        self.pre_sum.config(text=self.summary_txt.get("1.0", "end-1c"))
        
        footer = f"Author: {self.entries['author'].get()}  |  API: {self.entries['pluginApi'].get()}  |  LichtFeld: {self.entries['lichtfeldVersion'].get()}"
        self.pre_footer.config(text=footer)
        self.pre_id.config(text=f"ID: {ns.lower()}:{name}")
        
        for w in self.kw_frame.winfo_children(): w.destroy()
        for kw in self.entries["keywords"].get().split(","):
            if kw.strip(): tk.Label(self.kw_frame, text=kw.strip(), bg="#f0f0f0", font=("Arial", 8), padx=6, pady=2).pack(side="left", padx=2)

    def load_toml(self):
        path = filedialog.askopenfilename(filetypes=[("TOML files", "*.toml")])
        if not path: return
        try:
            with open(path, "rb") as f:
                data = tomllib.load(f)
                p = data.get("project", {})
                t = data.get("tool", {}).get("lichtfeld", {})
                
                for entry in self.entries.values(): entry.delete(0, tk.END)
                self.summary_txt.delete("1.0", tk.END)
                self.desc_txt.delete("1.0", tk.END)
                self.dep_txt.delete("1.0", tk.END)

                name = p.get("name", "")
                self.entries["name"].insert(0, name)
                self.entries["displayName"].insert(0, name)
                self.entries["namespace"].insert(0, "community")
                self.entries["latestVersion"].insert(0, p.get("version", ""))
                
                toml_authors = p.get("authors", [])
                if toml_authors and isinstance(toml_authors, list):
                    raw_author = toml_authors[0].get("name", "")
                    clean_author = raw_author.split(" / ")[0].strip()
                    self.entries["author"].insert(0, clean_author)

                self.summary_txt.insert("1.0", p.get("description", ""))
                self.desc_txt.insert("1.0", p.get("description", ""))
                self.entries["pluginApi"].insert(0, t.get("plugin_api", ""))
                self.entries["lichtfeldVersion"].insert(0, t.get("lichtfeld_version", ""))
                self.dep_txt.insert("1.0", "\n".join(p.get("dependencies", [])))
                
                self.update_preview()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load TOML: {e}")

    def save_json(self):
        name = self.entries['name'].get()
        save_path = filedialog.asksaveasfilename(initialfile=f"{name}.json", 
                                                 defaultextension=".json", 
                                                 filetypes=[("JSON files", "*.json")])
        if save_path:
            gui_data = {k: e.get() for k, e in self.entries.items()}
            out = {
                "id": f"{gui_data['namespace']}:{gui_data['name']}",
                "namespace": gui_data["namespace"],
                "name": gui_data["name"],
                "displayName": gui_data["displayName"],
                "summary": self.summary_txt.get("1.0", "end-1c"),
                "description": self.desc_txt.get("1.0", "end-1c"),
                "author": gui_data["author"],
                "latestVersion": gui_data["latestVersion"],
                "lichtfeldVersion": gui_data["lichtfeldVersion"],
                "pluginApi": gui_data["pluginApi"],
                "requiredFeatures": [],
                "downloads": 0,
                "keywords": [k.strip() for k in gui_data["keywords"].split(",") if k.strip()],
                "repository": gui_data["repository"],
                "versions": [{
                    "version": gui_data["latestVersion"],
                    "pluginApi": gui_data["pluginApi"],
                    "lichtfeldVersion": gui_data["lichtfeldVersion"],
                    "requiredFeatures": [],
                    "dependencies": [l.strip() for l in self.dep_txt.get("1.0", tk.END).splitlines() if l.strip()],
                    "gitRef": "main"
                }]
            }
            with open(save_path, "w") as f:
                json.dump(out, f, indent=2)
            messagebox.showinfo("Success", "JSON Saved Successfully")

if __name__ == "__main__":
    root = tk.Tk()
    app = PluginConfigGenerator(root)
    root.mainloop()
