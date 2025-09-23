import { Share } from '@capacitor/share';

export async function sharePdf(dataUrl: string, title = "Carnet d'entretien", text = "Mon rapport PDF"): Promise<void> {
  try {
    await Share.share({ title, text, url: dataUrl, dialogTitle: "Partager le PDF" });
  } catch {
    const win = window.open();
    if (win) {
      win.document.write('<iframe src="' + dataUrl + '" frameborder="0" style="width:100%;height:100%"></iframe>');
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'carnet_entretien.pdf';
      a.click();
    }
  }
}
