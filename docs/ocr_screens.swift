import Foundation
import Vision
import Cocoa

let mediaDir = "/Users/surya/Documents/Product/facility_management/docs/extracted_media"
let fm = FileManager.default

do {
    let files = try fm.contentsOfDirectory(atPath: mediaDir)
        .filter { $0.hasSuffix(".png") }
        .sorted {
            let n1 = Int($0.replacingOccurrences(of: "image", with: "").replacingOccurrences(of: ".png", with: "")) ?? 0
            let n2 = Int($1.replacingOccurrences(of: "image", with: "").replacingOccurrences(of: ".png", with: "")) ?? 0
            return n1 < n2
        }

    print("Running OCR on \(files.count) images...")

    for file in files {
        let path = "\(mediaDir)/\(file)"
        guard let image = NSImage(contentsOfFile: path),
              let tiffData = image.tiffRepresentation,
              let cgImage = NSBitmapImageRep(data: tiffData)?.cgImage else {
            print("Skipping \(file): failed to load CGImage")
            continue
        }
        
        let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        let request = VNRecognizeTextRequest { request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
            let recognizedStrings = observations.compactMap { $0.topCandidates(1).first?.string }
            print("\n--- \(file) ---")
            for str in recognizedStrings {
                print(str)
            }
        }
        request.recognitionLevel = .accurate
        try requestHandler.perform([request])
    }
} catch {
    print("Error listing directory: \(error)")
}
